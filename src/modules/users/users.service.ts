import {
  BadRequestException,
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';

import { AppLoggerService } from '../../common/logger/app-logger.service';
import { RedisService } from '../../common/redis/redis.service';
import { CreateUserDto } from './dto/create-user.dto';
import { SearchUsersDto } from './dto/search-users.dto';
import { UsersRepository } from './repositories/users.repository';

export interface SearchUsersResponse {
  data: PublicUser[];
  meta: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

type PublicUser = {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: 'tourist' | 'establishment' | 'lgu_admin';
  isActive: boolean;
  avatarUrl: string | null;
  createdAt: Date;
  updatedAt: Date;
};

@Injectable()
export class UsersService {
  private readonly searchCacheTTL = 30;

  constructor(
    private readonly usersRepository: UsersRepository,
    private readonly redisService: RedisService,
    private readonly logger: AppLoggerService,
  ) {}

  async createUser(payload: CreateUserDto) {
    const existing = await this.usersRepository.findByEmail(payload.email);
    if (existing) {
      throw new ConflictException('Email is already registered.');
    }

    const user = await this.usersRepository.create(payload);
    await this.redisService.delByPattern('users:search:*');

    this.logger.log(`User created with id=${user.id}`, 'UsersService');
    return this.toPublicUser(user);
  }

  async getUserById(userId: string) {
    const user = await this.usersRepository.findById(userId);

    if (!user) {
      throw new NotFoundException('User not found.');
    }

    return this.toPublicUser(user);
  }

  async searchUsers(query: SearchUsersDto): Promise<SearchUsersResponse> {
    const search = query.search?.trim() ?? '';
    const page = query.page;
    const pageSize = query.pageSize;

    if (!search) {
      throw new BadRequestException('Query parameter "search" is required.');
    }

    const cacheKey = `users:search:${search.toLowerCase()}:${page}:${pageSize}`;

    const cached = await this.redisService.getJson<SearchUsersResponse>(cacheKey);
    if (cached) {
      return cached;
    }

    const offset = (page - 1) * pageSize;

    const [rows, total] = await Promise.all([
      this.usersRepository.search(search, pageSize, offset),
      this.usersRepository.countBySearch(search),
    ]);

    const response: SearchUsersResponse = {
      data: rows.map((row) => this.toPublicUser(row)),
      meta: {
        page,
        pageSize,
        total,
        totalPages: Math.max(1, Math.ceil(total / pageSize)),
      },
    };

    await this.redisService.setJson(cacheKey, response, this.searchCacheTTL);
    return response;
  }

  async uploadAvatar(userId: string, avatarUrl: string) {
    const updated = await this.usersRepository.updateAvatar(userId, avatarUrl);

    if (!updated) {
      throw new NotFoundException('User not found.');
    }

    await this.redisService.delByPattern('users:search:*');
    return this.toPublicUser(updated);
  }

  private toPublicUser(user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    role: 'tourist' | 'establishment' | 'lgu_admin';
    isActive: boolean;
    avatarUrl: string | null;
    createdAt: Date;
    updatedAt: Date;
  }): PublicUser {
    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      isActive: user.isActive,
      avatarUrl: user.avatarUrl,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }
}

