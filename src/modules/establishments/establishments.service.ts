import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';

import { AppLoggerService } from '../../common/logger/app-logger.service';
import { RedisService } from '../../common/redis/redis.service';
import { AuthenticatedUser } from '../auth/types/authenticated-user.type';
import {
  CreateEstablishmentDto,
  ListMyEstablishmentsDto,
  SearchEstablishmentsDto,
  UpdateEstablishmentStatusDto,
  VerifyEstablishmentDto,
} from './dto/establishments.dto';
import { EstablishmentsRepository } from './repositories/establishments.repository';

@Injectable()
export class EstablishmentsService {
  constructor(
    private readonly establishmentsRepository: EstablishmentsRepository,
    private readonly redisService: RedisService,
    private readonly logger: AppLoggerService,
  ) {}

  async register(payload: CreateEstablishmentDto, currentUser: AuthenticatedUser) {
    const created = await this.establishmentsRepository.create({
      ...payload,
      ownerUserId: currentUser.userId,
      listingStatus: 'pending',
      businessStatus: payload.isOpenNow ? 'open' : 'closed',
      updatedAt: new Date(),
    });

    await this.redisService.delByPattern('establishments:search:*');
    await this.redisService.delByPattern(`establishments:mine:${currentUser.userId}:*`);
    this.logger.log(`Establishment registered id=${created.id}`, 'EstablishmentsService');

    return created;
  }

  async findById(establishmentId: string) {
    const row = await this.establishmentsRepository.findById(establishmentId);
    if (!row) {
      throw new NotFoundException('Establishment not found.');
    }

    return row;
  }

  async search(query: SearchEstablishmentsDto) {
    const cacheKey = `establishments:search:${JSON.stringify(query)}`;
    const cached = await this.redisService.getJson<Awaited<ReturnType<EstablishmentsRepository['search']>>>(
      cacheKey,
    );

    if (cached) {
      return cached;
    }

    const results = await this.establishmentsRepository.search(query);
    await this.redisService.setJson(cacheKey, results, 30);

    return results;
  }

  async listMine(query: ListMyEstablishmentsDto, currentUser: AuthenticatedUser) {
    const cacheKey = `establishments:mine:${currentUser.userId}:${JSON.stringify(query)}`;
    const cached = await this.redisService.getJson<Awaited<ReturnType<EstablishmentsRepository['listByOwner']>>>(
      cacheKey,
    );

    if (cached) {
      return cached;
    }

    const results = await this.establishmentsRepository.listByOwner(currentUser.userId, {
      listingStatus: query.listingStatus,
      page: query.page,
      pageSize: query.pageSize,
    });

    await this.redisService.setJson(cacheKey, results, 30);
    return results;
  }

  async verify(establishmentId: string, payload: VerifyEstablishmentDto, currentUser: AuthenticatedUser) {
    const updated = await this.establishmentsRepository.verifyListing(
      establishmentId,
      payload.listingStatus as 'verified' | 'rejected',
      currentUser.userId,
    );

    if (!updated) {
      throw new NotFoundException('Establishment not found.');
    }

    await this.redisService.delByPattern('establishments:search:*');
    if (updated.ownerUserId) {
      await this.redisService.delByPattern(`establishments:mine:${updated.ownerUserId}:*`);
    }
    return updated;
  }

  async updateStatus(
    establishmentId: string,
    payload: UpdateEstablishmentStatusDto,
    currentUser: AuthenticatedUser,
  ) {
    await this.assertCanManage(establishmentId, currentUser);

    const updated = await this.establishmentsRepository.updateBusinessStatus(establishmentId, payload);

    if (!updated) {
      throw new NotFoundException('Establishment not found.');
    }

    await this.redisService.delByPattern('establishments:search:*');
    if (updated.ownerUserId) {
      await this.redisService.delByPattern(`establishments:mine:${updated.ownerUserId}:*`);
    }
    return updated;
  }

  async updateCoverPhoto(
    establishmentId: string,
    coverPhotoUrl: string,
    currentUser: AuthenticatedUser,
  ) {
    await this.assertCanManage(establishmentId, currentUser);

    const updated = await this.establishmentsRepository.updateCoverPhoto(establishmentId, coverPhotoUrl);

    if (!updated) {
      throw new NotFoundException('Establishment not found.');
    }

    await this.redisService.delByPattern('establishments:search:*');
    if (updated.ownerUserId) {
      await this.redisService.delByPattern(`establishments:mine:${updated.ownerUserId}:*`);
    }
    return updated;
  }

  private async assertCanManage(establishmentId: string, currentUser: AuthenticatedUser): Promise<void> {
    if (currentUser.role === 'lgu_admin') {
      return;
    }

    const establishment = await this.establishmentsRepository.findById(establishmentId);
    if (!establishment) {
      throw new NotFoundException('Establishment not found.');
    }

    if (establishment.ownerUserId !== currentUser.userId) {
      throw new ForbiddenException('You can only manage establishments you own.');
    }
  }
}
