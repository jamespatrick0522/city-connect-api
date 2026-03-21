import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Logger } from '@nestjs/common';
import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
  WsException,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';

import { AuthenticatedUser, JwtPayload } from '../auth/types/authenticated-user.type';
import { EstablishmentsRepository } from '../establishments/repositories/establishments.repository';
import { UsersRepository } from '../users/repositories/users.repository';
import {
  buildEstablishmentRoom,
  buildGuestConversationRooms,
  CHAT_EVENTS,
} from './chat.constants';

interface JoinEstablishmentInboxPayload {
  establishmentId: string;
}

interface JoinGuestConversationPayload {
  establishmentId: string;
  guestEmail?: string;
  guestPhone?: string;
}

interface OutboundMessagePayload {
  id: string;
  establishmentId: string;
  senderRole: 'tourist' | 'establishment';
  userId: string | null;
  guestFullName: string | null;
  guestEmail: string | null;
  guestPhone: string | null;
  message: string;
  createdAt: Date;
}

interface MessageSentEventPayload {
  clientRequestId?: string | null;
  message: OutboundMessagePayload;
}

interface MessageFailedEventPayload {
  clientRequestId?: string | null;
  establishmentId: string;
  guestEmail?: string | null;
  guestPhone?: string | null;
  reason: string;
  at: string;
}

@WebSocketGateway({
  namespace: '/chat',
  cors: {
    origin: '*',
  },
})
export class ChatGateway implements OnGatewayConnection {
  @WebSocketServer()
  server!: Server;

  private readonly logger = new Logger(ChatGateway.name);

  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly usersRepository: UsersRepository,
    private readonly establishmentsRepository: EstablishmentsRepository,
  ) {}

  async handleConnection(client: Socket): Promise<void> {
    try {
      const user = await this.authenticateSocket(client);
      client.data.user = user;
      this.logger.debug(`Socket connected: ${client.id} user=${user.userId} role=${user.role}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unauthorized socket connection';
      this.logger.warn(`Socket rejected ${client.id}: ${message}`);
      client.disconnect(true);
    }
  }

  @SubscribeMessage(CHAT_EVENTS.JOIN_ESTABLISHMENT_INBOX)
  joinEstablishmentInbox(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: JoinEstablishmentInboxPayload,
  ): Promise<{ joined: string }> {
    if (!payload?.establishmentId) {
      throw new WsException('establishmentId is required.');
    }

    return this.joinEstablishmentRoom(client, payload.establishmentId);
  }

  @SubscribeMessage(CHAT_EVENTS.JOIN_GUEST_CONVERSATION)
  async joinGuestConversation(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: JoinGuestConversationPayload,
  ): Promise<{ joined: string[] }> {
    if (!payload?.establishmentId) {
      throw new WsException('establishmentId is required.');
    }

    const rooms = buildGuestConversationRooms(
      payload.establishmentId,
      payload.guestEmail,
      payload.guestPhone,
    );

    if (!rooms.length) {
      throw new WsException('guestEmail or guestPhone is required.');
    }

    await this.assertEstablishmentAccess(client, payload.establishmentId);
    rooms.forEach((room) => client.join(room));

    return { joined: rooms };
  }

  @SubscribeMessage(CHAT_EVENTS.LEAVE_GUEST_CONVERSATION)
  async leaveGuestConversation(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: JoinGuestConversationPayload,
  ): Promise<{ left: string[] }> {
    if (!payload?.establishmentId) {
      throw new WsException('establishmentId is required.');
    }

    await this.assertEstablishmentAccess(client, payload.establishmentId);

    const rooms = buildGuestConversationRooms(
      payload.establishmentId,
      payload.guestEmail,
      payload.guestPhone,
    );

    rooms.forEach((room) => client.leave(room));

    return { left: rooms };
  }

  private async joinEstablishmentRoom(
    client: Socket,
    establishmentId: string,
  ): Promise<{ joined: string }> {
    await this.assertEstablishmentAccess(client, establishmentId);
    const room = buildEstablishmentRoom(establishmentId);
    client.join(room);

    return { joined: room };
  }

  emitNewMessage(message: OutboundMessagePayload): void {
    const establishmentRoom = buildEstablishmentRoom(message.establishmentId);
    const conversationRooms = buildGuestConversationRooms(
      message.establishmentId,
      message.guestEmail,
      message.guestPhone,
    );

    this.server.to(establishmentRoom).emit(CHAT_EVENTS.MESSAGE_NEW, message);
    conversationRooms.forEach((room) => {
      this.server.to(room).emit(CHAT_EVENTS.MESSAGE_NEW, message);
    });
  }

  emitMessageSent(payload: MessageSentEventPayload): void {
    const establishmentRoom = buildEstablishmentRoom(payload.message.establishmentId);
    const conversationRooms = buildGuestConversationRooms(
      payload.message.establishmentId,
      payload.message.guestEmail,
      payload.message.guestPhone,
    );

    this.server.to(establishmentRoom).emit(CHAT_EVENTS.MESSAGE_SENT, payload);
    conversationRooms.forEach((room) => {
      this.server.to(room).emit(CHAT_EVENTS.MESSAGE_SENT, payload);
    });
  }

  emitMessageFailed(payload: MessageFailedEventPayload): void {
    const establishmentRoom = buildEstablishmentRoom(payload.establishmentId);
    const conversationRooms = buildGuestConversationRooms(
      payload.establishmentId,
      payload.guestEmail,
      payload.guestPhone,
    );

    this.server.to(establishmentRoom).emit(CHAT_EVENTS.MESSAGE_FAILED, payload);
    conversationRooms.forEach((room) => {
      this.server.to(room).emit(CHAT_EVENTS.MESSAGE_FAILED, payload);
    });
  }

  private async authenticateSocket(client: Socket): Promise<AuthenticatedUser> {
    const token = this.extractToken(client);

    if (!token) {
      throw new WsException('Missing JWT token in websocket handshake.');
    }

    let payload: JwtPayload;
    try {
      payload = await this.jwtService.verifyAsync<JwtPayload>(token, {
        secret: this.configService.getOrThrow<string>('app.auth.jwtSecret'),
      });
    } catch {
      throw new WsException('Invalid or expired JWT token.');
    }

    const user = await this.usersRepository.findById(payload.sub);
    if (!user || !user.isActive) {
      throw new WsException('User not found or inactive.');
    }

    if (user.role !== 'establishment' && user.role !== 'lgu_admin') {
      throw new WsException('Websocket chat is restricted to establishment and LGU admin accounts.');
    }

    return {
      userId: user.id,
      email: user.email,
      role: user.role,
    };
  }

  private extractToken(client: Socket): string | null {
    const authToken = client.handshake.auth?.token;
    const headerToken = client.handshake.headers.authorization;

    const raw = (typeof authToken === 'string' ? authToken : headerToken) ?? '';
    if (!raw) {
      return null;
    }

    if (raw.toLowerCase().startsWith('bearer ')) {
      return raw.slice(7).trim();
    }

    return raw.trim();
  }

  private async assertEstablishmentAccess(client: Socket, establishmentId: string): Promise<void> {
    const user = client.data.user as AuthenticatedUser | undefined;

    if (!user) {
      throw new WsException('Unauthenticated websocket session.');
    }

    if (user.role === 'lgu_admin') {
      return;
    }

    if (user.role !== 'establishment') {
      throw new WsException('Only establishment or LGU admin users can access chat rooms.');
    }

    const establishment = await this.establishmentsRepository.findById(establishmentId);
    if (!establishment) {
      throw new WsException('Establishment not found.');
    }

    if (establishment.ownerUserId !== user.userId) {
      throw new WsException('You can only access rooms for establishments you own.');
    }
  }
}
