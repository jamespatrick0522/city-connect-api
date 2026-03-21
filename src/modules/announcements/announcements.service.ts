import { Injectable } from '@nestjs/common';

import { RedisService } from '../../common/redis/redis.service';
import { AuthenticatedUser } from '../auth/types/authenticated-user.type';
import { CreateAnnouncementDto, ListAnnouncementsDto } from './dto/announcements.dto';
import { AnnouncementsRepository } from './repositories/announcements.repository';

@Injectable()
export class AnnouncementsService {
  constructor(
    private readonly announcementsRepository: AnnouncementsRepository,
    private readonly redisService: RedisService,
  ) {}

  async create(payload: CreateAnnouncementDto, currentUser: AuthenticatedUser) {
    const announcement = await this.announcementsRepository.create({
      city: payload.city,
      title: payload.title,
      content: payload.content,
      publishedByUserId: currentUser.userId,
      startsAt: payload.startsAt ? new Date(payload.startsAt) : null,
      endsAt: payload.endsAt ? new Date(payload.endsAt) : null,
      updatedAt: new Date(),
    });

    await this.redisService.delByPattern('announcements:*');
    return announcement;
  }

  async list(query: ListAnnouncementsDto) {
    const limit = Math.min(100, Math.max(1, query.limit || 20));
    const cacheKey = `announcements:${query.city ?? 'all'}:${limit}`;

    const cached = await this.redisService.getJson(cacheKey);
    if (cached) {
      return cached;
    }

    const rows = await this.announcementsRepository.list(query.city, limit);
    await this.redisService.setJson(cacheKey, rows, 60);

    return rows;
  }
}
