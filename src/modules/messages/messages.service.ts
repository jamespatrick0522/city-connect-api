import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

import { AuthenticatedUser } from '../auth/types/authenticated-user.type';
import {
  GetGuestThreadDto,
  ListConversationsDto,
  ListGuestConversationDto,
  ReplyToGuestDto,
  SendGuestMessageDto,
} from './dto/messages.dto';
import { ChatGateway } from './chat.gateway';
import { MessagesRepository } from './repositories/messages.repository';
import { EstablishmentsRepository } from '../establishments/repositories/establishments.repository';

export interface ConversationSummary {
  conversationKey: string;
  establishmentId: string;
  guestFullName: string | null;
  guestEmail: string | null;
  guestPhone: string | null;
  lastMessage: string;
  lastSenderRole: 'tourist' | 'establishment';
  lastMessageAt: Date;
  messageCount: number;
}

interface GuestConversationTokenPayload {
  type: 'guest_conversation';
  establishmentId: string;
  guestEmail?: string | null;
  guestPhone?: string | null;
}

@Injectable()
export class MessagesService {
  constructor(
    private readonly messagesRepository: MessagesRepository,
    private readonly establishmentsRepository: EstablishmentsRepository,
    private readonly chatGateway: ChatGateway,
    private readonly jwtService: JwtService,
  ) {}

  async sendGuestMessage(payload: SendGuestMessageDto) {
    try {
      this.ensureGuestIdentity(payload.email, payload.phone);

      const establishment = await this.establishmentsRepository.findById(payload.establishmentId);
      if (!establishment) {
        throw new NotFoundException('Establishment not found.');
      }

      const message = await this.messagesRepository.create({
        userId: null,
        establishmentId: payload.establishmentId,
        senderRole: 'tourist',
        guestFullName: payload.fullName,
        guestEmail: payload.email ?? null,
        guestPhone: payload.phone ?? null,
        message: payload.message,
        createdAt: new Date(),
      });

      const conversationToken = await this.createConversationToken({
        establishmentId: payload.establishmentId,
        guestEmail: payload.email ?? null,
        guestPhone: payload.phone ?? null,
      });

      this.chatGateway.emitNewMessage(message);
      this.chatGateway.emitMessageSent({
        clientRequestId: payload.clientRequestId ?? null,
        message,
      });

      return {
        message,
        conversationToken,
      };
    } catch (error) {
      this.chatGateway.emitMessageFailed({
        clientRequestId: payload.clientRequestId ?? null,
        establishmentId: payload.establishmentId,
        guestEmail: payload.email ?? null,
        guestPhone: payload.phone ?? null,
        reason: this.extractErrorMessage(error),
        at: new Date().toISOString(),
      });
      throw error;
    }
  }

  async listGuestThread(query: GetGuestThreadDto) {
    const tokenPayload = await this.verifyConversationToken(query.conversationToken);
    this.ensureGuestIdentity(tokenPayload.guestEmail ?? undefined, tokenPayload.guestPhone ?? undefined);

    const page = Math.max(1, query.page || 1);
    const pageSize = Math.min(200, Math.max(1, query.pageSize || 50));
    const offset = (page - 1) * pageSize;

    const [rows, total] = await Promise.all([
      this.messagesRepository.listGuestConversation(
        tokenPayload.establishmentId,
        tokenPayload.guestEmail ?? undefined,
        tokenPayload.guestPhone ?? undefined,
        pageSize,
        offset,
      ),
      this.messagesRepository.countGuestConversation(
        tokenPayload.establishmentId,
        tokenPayload.guestEmail ?? undefined,
        tokenPayload.guestPhone ?? undefined,
      ),
    ]);

    return {
      conversation: {
        establishmentId: tokenPayload.establishmentId,
        guestEmail: tokenPayload.guestEmail ?? null,
        guestPhone: tokenPayload.guestPhone ?? null,
      },
      data: rows,
      meta: {
        page,
        pageSize,
        total,
        totalPages: Math.max(1, Math.ceil(total / pageSize)),
      },
    };
  }

  async replyToGuest(payload: ReplyToGuestDto, currentUser: AuthenticatedUser) {
    try {
      this.ensureGuestIdentity(payload.guestEmail, payload.guestPhone);

      await this.assertCanReplyAsEstablishment(payload.establishmentId, currentUser);

      const message = await this.messagesRepository.create({
        userId: currentUser.userId,
        establishmentId: payload.establishmentId,
        senderRole: 'establishment',
        guestFullName: payload.guestFullName ?? null,
        guestEmail: payload.guestEmail ?? null,
        guestPhone: payload.guestPhone ?? null,
        message: payload.message,
        createdAt: new Date(),
      });

      this.chatGateway.emitNewMessage(message);
      this.chatGateway.emitMessageSent({
        clientRequestId: payload.clientRequestId ?? null,
        message,
      });

      return message;
    } catch (error) {
      this.chatGateway.emitMessageFailed({
        clientRequestId: payload.clientRequestId ?? null,
        establishmentId: payload.establishmentId,
        guestEmail: payload.guestEmail ?? null,
        guestPhone: payload.guestPhone ?? null,
        reason: this.extractErrorMessage(error),
        at: new Date().toISOString(),
      });
      throw error;
    }
  }

  async listConversations(query: ListConversationsDto, currentUser: AuthenticatedUser) {
    await this.assertCanReplyAsEstablishment(query.establishmentId, currentUser);

    const page = Math.max(1, query.page || 1);
    const pageSize = Math.min(200, Math.max(1, query.pageSize || 30));
    const searchTerm = query.search?.trim().toLowerCase();

    const rows = await this.messagesRepository.listRecentByEstablishment(query.establishmentId, 2000);
    const conversations = new Map<string, ConversationSummary>();

    for (const row of rows) {
      const key = this.getConversationKey(row.guestEmail, row.guestPhone);
      if (!key) {
        continue;
      }

      const existing = conversations.get(key);
      if (!existing) {
        conversations.set(key, {
          conversationKey: key,
          establishmentId: row.establishmentId,
          guestFullName: row.guestFullName,
          guestEmail: row.guestEmail,
          guestPhone: row.guestPhone,
          lastMessage: row.message,
          lastSenderRole: row.senderRole,
          lastMessageAt: row.createdAt,
          messageCount: 1,
        });
        continue;
      }

      existing.messageCount += 1;
      if (!existing.guestFullName && row.guestFullName) {
        existing.guestFullName = row.guestFullName;
      }
      if (!existing.guestEmail && row.guestEmail) {
        existing.guestEmail = row.guestEmail;
      }
      if (!existing.guestPhone && row.guestPhone) {
        existing.guestPhone = row.guestPhone;
      }
    }

    let data = Array.from(conversations.values());

    if (searchTerm) {
      data = data.filter((item) =>
        [item.guestFullName, item.guestEmail, item.guestPhone, item.lastMessage]
          .filter(Boolean)
          .some((value) => value!.toLowerCase().includes(searchTerm)),
      );
    }

    const total = data.length;
    const offset = (page - 1) * pageSize;

    data = data.slice(offset, offset + pageSize);

    return {
      data,
      meta: {
        page,
        pageSize,
        total,
        totalPages: Math.max(1, Math.ceil(total / pageSize)),
      },
    };
  }

  async listGuestConversation(query: ListGuestConversationDto, currentUser: AuthenticatedUser) {
    this.ensureGuestIdentity(query.guestEmail, query.guestPhone);

    await this.assertCanReplyAsEstablishment(query.establishmentId, currentUser);

    const page = Math.max(1, query.page || 1);
    const pageSize = Math.min(200, Math.max(1, query.pageSize || 50));
    const offset = (page - 1) * pageSize;

    const [rows, total] = await Promise.all([
      this.messagesRepository.listGuestConversation(
        query.establishmentId,
        query.guestEmail,
        query.guestPhone,
        pageSize,
        offset,
      ),
      this.messagesRepository.countGuestConversation(
        query.establishmentId,
        query.guestEmail,
        query.guestPhone,
      ),
    ]);

    return {
      data: rows,
      meta: {
        page,
        pageSize,
        total,
        totalPages: Math.max(1, Math.ceil(total / pageSize)),
      },
    };
  }

  private ensureGuestIdentity(email?: string, phone?: string): void {
    if (!email && !phone) {
      throw new BadRequestException('Either email or phone is required for guest chat.');
    }
  }

  private extractErrorMessage(error: unknown): string {
    if (error instanceof Error && error.message) {
      return error.message;
    }

    return 'Message send failed.';
  }

  private getConversationKey(guestEmail?: string | null, guestPhone?: string | null): string | null {
    if (guestEmail?.trim()) {
      return `email:${guestEmail.trim().toLowerCase()}`;
    }

    if (guestPhone?.trim()) {
      return `phone:${guestPhone.trim().toLowerCase()}`;
    }

    return null;
  }

  private async createConversationToken(payload: {
    establishmentId: string;
    guestEmail?: string | null;
    guestPhone?: string | null;
  }) {
    return this.jwtService.signAsync(
      {
        type: 'guest_conversation',
        establishmentId: payload.establishmentId,
        guestEmail: payload.guestEmail ?? null,
        guestPhone: payload.guestPhone ?? null,
      } satisfies GuestConversationTokenPayload,
      {
        expiresIn: '14d',
      },
    );
  }

  private async verifyConversationToken(token: string): Promise<GuestConversationTokenPayload> {
    try {
      const payload = await this.jwtService.verifyAsync<GuestConversationTokenPayload>(token);
      if (payload.type !== 'guest_conversation') {
        throw new BadRequestException('Invalid conversation token.');
      }

      this.ensureGuestIdentity(payload.guestEmail ?? undefined, payload.guestPhone ?? undefined);
      return payload;
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }

      throw new BadRequestException('Invalid or expired conversation token.');
    }
  }

  private async assertCanReplyAsEstablishment(
    establishmentId: string,
    currentUser: AuthenticatedUser,
  ): Promise<void> {
    if (currentUser.role === 'lgu_admin') {
      return;
    }

    const establishment = await this.establishmentsRepository.findById(establishmentId);
    if (!establishment) {
      throw new NotFoundException('Establishment not found.');
    }

    if (establishment.ownerUserId !== currentUser.userId) {
      throw new ForbiddenException('You can only manage chats for your own establishment.');
    }
  }
}
