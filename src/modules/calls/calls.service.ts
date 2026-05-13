import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { RtcRole, RtcTokenBuilder } from 'agora-access-token';
import { randomUUID } from 'crypto';

import { VoiceCall } from '../../common/database/schema';
import { AuthenticatedUser } from '../auth/types/authenticated-user.type';
import { EstablishmentsRepository } from '../establishments/repositories/establishments.repository';
import { ChatGateway } from '../messages/chat.gateway';
import { CallsRepository } from './repositories/calls.repository';
import { StartGuestCallDto } from './dto/calls.dto';

type CallStatus = VoiceCall['status'];

export interface VoiceCallTokenPayload {
  appId: string;
  channelName: string;
  uid: string;
  token: string;
  expiresAt: string;
}

@Injectable()
export class CallsService {
  private readonly missedTimers = new Map<string, NodeJS.Timeout>();

  constructor(
    private readonly callsRepository: CallsRepository,
    private readonly establishmentsRepository: EstablishmentsRepository,
    private readonly chatGateway: ChatGateway,
    private readonly configService: ConfigService,
  ) {}

  async startGuestCall(payload: StartGuestCallDto) {
    this.assertAgoraConfigured();
    this.ensureGuestIdentity(payload.email, payload.phone);

    const establishment = await this.establishmentsRepository.findById(payload.establishmentId);
    if (!establishment || establishment.listingStatus !== 'verified') {
      throw new NotFoundException('Establishment not found.');
    }

    if (!establishment.ownerUserId) {
      throw new BadRequestException('This establishment is not available for in-app calls yet.');
    }

    const ringSeconds = this.getRingSeconds();
    const callId = randomUUID();
    const now = new Date();
    const expiresAt = new Date(now.getTime() + ringSeconds * 1000);
    const channelName = `city-connect-call-${callId.replace(/-/g, '')}`;

    const call = await this.callsRepository.create({
      id: callId,
      establishmentId: payload.establishmentId,
      guestFullName: payload.fullName.trim(),
      guestEmail: payload.email?.trim() || null,
      guestPhone: payload.phone?.trim() || null,
      status: 'ringing',
      provider: 'agora',
      channelName,
      touristUid: `tourist-${callId}`,
      establishmentUid: `establishment-${callId}`,
      expiresAt,
      startedAt: now,
      updatedAt: now,
    });

    this.scheduleMissed(call.id, ringSeconds);
    this.chatGateway.emitIncomingCall({
      call: this.toPublicCall(call),
      establishmentName: establishment.name,
      clientRequestId: payload.clientRequestId ?? null,
    });

    return this.toGuestResponse(call);
  }

  async getGuestCall(callId: string) {
    const call = await this.findCallOrThrow(callId);
    const current = await this.markMissedIfExpired(call);
    return this.toGuestResponse(current);
  }

  async acceptCall(callId: string, currentUser: AuthenticatedUser) {
    const call = await this.findCallOrThrow(callId);
    await this.assertCanManage(call.establishmentId, currentUser);

    const current = await this.markMissedIfExpired(call);
    if (current.status !== 'ringing') {
      throw new BadRequestException(`Call cannot be accepted because it is already ${current.status}.`);
    }

    const accepted = await this.callsRepository.updateStatus(callId, {
      status: 'accepted',
      acceptedByUserId: currentUser.userId,
      acceptedAt: new Date(),
    });

    if (!accepted) {
      throw new NotFoundException('Call not found.');
    }

    this.clearMissedTimer(callId);
    this.chatGateway.emitCallAccepted({ call: this.toPublicCall(accepted) });

    return {
      call: this.toPublicCall(accepted),
      agora: this.buildToken(accepted.channelName, accepted.establishmentUid),
    };
  }

  async rejectCall(callId: string, currentUser: AuthenticatedUser) {
    const call = await this.findCallOrThrow(callId);
    await this.assertCanManage(call.establishmentId, currentUser);

    const current = await this.markMissedIfExpired(call);
    if (current.status !== 'ringing') {
      throw new BadRequestException(`Call cannot be rejected because it is already ${current.status}.`);
    }

    const rejected = await this.callsRepository.updateStatus(callId, {
      status: 'rejected',
      rejectedByUserId: currentUser.userId,
      endedAt: new Date(),
    });

    if (!rejected) {
      throw new NotFoundException('Call not found.');
    }

    this.clearMissedTimer(callId);
    this.chatGateway.emitCallRejected({ call: this.toPublicCall(rejected) });
    return { call: this.toPublicCall(rejected) };
  }

  async endGuestCall(callId: string) {
    const call = await this.findCallOrThrow(callId);
    return this.endCall(call);
  }

  async endCallAsEstablishment(callId: string, currentUser: AuthenticatedUser) {
    const call = await this.findCallOrThrow(callId);
    await this.assertCanManage(call.establishmentId, currentUser);
    return this.endCall(call);
  }

  private async endCall(call: VoiceCall) {
    const current = await this.markMissedIfExpired(call);
    if (!['ringing', 'accepted'].includes(current.status)) {
      return { call: this.toPublicCall(current) };
    }

    const ended = await this.callsRepository.updateStatus(current.id, {
      status: 'ended',
      endedAt: new Date(),
    });

    if (!ended) {
      throw new NotFoundException('Call not found.');
    }

    this.clearMissedTimer(current.id);
    this.chatGateway.emitCallEnded({ call: this.toPublicCall(ended) });
    return { call: this.toPublicCall(ended) };
  }

  private async markMissedIfExpired(call: VoiceCall): Promise<VoiceCall> {
    if (call.status !== 'ringing' || call.expiresAt.getTime() > Date.now()) {
      return call;
    }

    const missed = await this.callsRepository.updateStatus(call.id, {
      status: 'missed',
      endedAt: new Date(),
    });

    if (!missed) {
      return call;
    }

    this.clearMissedTimer(call.id);
    this.chatGateway.emitCallMissed({ call: this.toPublicCall(missed) });
    return missed;
  }

  private scheduleMissed(callId: string, ringSeconds: number): void {
    this.clearMissedTimer(callId);
    const timer = setTimeout(() => {
      void this.getGuestCall(callId).catch(() => undefined);
    }, ringSeconds * 1000 + 500);

    this.missedTimers.set(callId, timer);
  }

  private clearMissedTimer(callId: string): void {
    const timer = this.missedTimers.get(callId);
    if (timer) {
      clearTimeout(timer);
      this.missedTimers.delete(callId);
    }
  }

  private async findCallOrThrow(callId: string): Promise<VoiceCall> {
    const call = await this.callsRepository.findById(callId);
    if (!call) {
      throw new NotFoundException('Call not found.');
    }

    return call as VoiceCall;
  }

  private async assertCanManage(establishmentId: string, currentUser: AuthenticatedUser) {
    if (currentUser.role !== 'establishment') {
      throw new ForbiddenException('Only establishment accounts can answer calls.');
    }

    const establishment = await this.establishmentsRepository.findById(establishmentId);
    if (!establishment) {
      throw new NotFoundException('Establishment not found.');
    }

    if (establishment.ownerUserId !== currentUser.userId) {
      throw new ForbiddenException('You can only answer calls for your own establishment.');
    }
  }

  private toGuestResponse(call: VoiceCall) {
    return {
      call: this.toPublicCall(call),
      agora: call.status === 'accepted' ? this.buildToken(call.channelName, call.touristUid) : null,
    };
  }

  private toPublicCall(call: VoiceCall) {
    return {
      id: call.id,
      establishmentId: call.establishmentId,
      guestFullName: call.guestFullName,
      guestEmail: call.guestEmail,
      guestPhone: call.guestPhone,
      status: call.status,
      provider: call.provider,
      channelName: call.channelName,
      startedAt: call.startedAt,
      acceptedAt: call.acceptedAt,
      endedAt: call.endedAt,
      expiresAt: call.expiresAt,
      createdAt: call.createdAt,
      updatedAt: call.updatedAt,
    };
  }

  private buildToken(channelName: string, uid: string): VoiceCallTokenPayload {
    const appId = this.configService.get<string>('app.agora.appId') ?? '';
    const appCertificate = this.configService.get<string>('app.agora.appCertificate') ?? '';
    const expiresInSeconds = Math.max(
      60,
      this.configService.get<number>('app.agora.tokenExpiresInSeconds') ?? 3600,
    );

    if (!appId || !appCertificate) {
      throw new ServiceUnavailableException('Agora voice calling is not configured yet.');
    }

    const expiresAtSeconds = Math.floor(Date.now() / 1000) + expiresInSeconds;
    const token = RtcTokenBuilder.buildTokenWithAccount(
      appId,
      appCertificate,
      channelName,
      uid,
      RtcRole.PUBLISHER,
      expiresAtSeconds,
    );

    return {
      appId,
      channelName,
      uid,
      token,
      expiresAt: new Date(expiresAtSeconds * 1000).toISOString(),
    };
  }

  private assertAgoraConfigured(): void {
    const appId = this.configService.get<string>('app.agora.appId') ?? '';
    const appCertificate = this.configService.get<string>('app.agora.appCertificate') ?? '';

    if (!appId || !appCertificate) {
      throw new ServiceUnavailableException('Agora voice calling is not configured yet.');
    }
  }

  private ensureGuestIdentity(email?: string, phone?: string): void {
    if (!email?.trim() && !phone?.trim()) {
      throw new BadRequestException('Either email or phone is required for voice calls.');
    }
  }

  private getRingSeconds(): number {
    return Math.max(10, Math.min(120, this.configService.get<number>('app.agora.callRingSeconds') ?? 30));
  }
}
