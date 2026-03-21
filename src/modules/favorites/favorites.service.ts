import { ConflictException, Injectable } from '@nestjs/common';

import { RedisService } from '../../common/redis/redis.service';
import { CreateFavoriteDto, ListFavoritesDto } from './dto/favorites.dto';
import { FavoritesRepository } from './repositories/favorites.repository';

@Injectable()
export class FavoritesService {
  constructor(
    private readonly favoritesRepository: FavoritesRepository,
    private readonly redisService: RedisService,
  ) {}

  async create(payload: CreateFavoriteDto) {
    const existing = await this.favoritesRepository.findByUserAndEstablishment(
      payload.userId,
      payload.establishmentId,
    );

    if (existing) {
      throw new ConflictException('Favorite already exists.');
    }

    const favorite = await this.favoritesRepository.create(payload);
    await this.redisService.delByPattern(`favorites:user:${payload.userId}:*`);

    return favorite;
  }

  async listByUser(query: ListFavoritesDto) {
    const page = Math.max(1, query.page || 1);
    const pageSize = Math.min(100, Math.max(1, query.pageSize || 20));
    const offset = (page - 1) * pageSize;

    const cacheKey = `favorites:user:${query.userId}:${page}:${pageSize}`;
    const cached = await this.redisService.getJson(cacheKey);
    if (cached) {
      return cached;
    }

    const [rows, total] = await Promise.all([
      this.favoritesRepository.findByUser(query.userId, pageSize, offset),
      this.favoritesRepository.countByUser(query.userId),
    ]);

    const result = {
      data: rows,
      meta: {
        page,
        pageSize,
        total,
        totalPages: Math.max(1, Math.ceil(total / pageSize)),
      },
    };

    await this.redisService.setJson(cacheKey, result, 45);
    return result;
  }

  async remove(favoriteId: string) {
    const favorite = await this.favoritesRepository.findById(favoriteId);
    const removed = await this.favoritesRepository.deleteById(favoriteId);

    if (favorite?.userId) {
      await this.redisService.delByPattern(`favorites:user:${favorite.userId}:*`);
    }

    return { deleted: removed };
  }
}
