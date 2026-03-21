import { Global, Inject, Module, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

import { TOKENS } from '../constants/tokens';
import { RedisService } from './redis.service';

@Global()
@Module({
  providers: [
    {
      provide: TOKENS.REDIS_CLIENT,
      inject: [ConfigService],
      useFactory: (configService: ConfigService): Redis =>
        new Redis({
          host: configService.getOrThrow<string>('app.redis.host'),
          port: configService.getOrThrow<number>('app.redis.port'),
          password: configService.get<string>('app.redis.password'),
          db: configService.getOrThrow<number>('app.redis.db'),
          lazyConnect: true,
          maxRetriesPerRequest: 1,
          enableReadyCheck: true,
        }),
    },
    RedisService,
  ],
  exports: [TOKENS.REDIS_CLIENT, RedisService],
})
export class RedisModule implements OnModuleDestroy {
  constructor(@Inject(TOKENS.REDIS_CLIENT) private readonly redisClient: Redis) {}

  async onModuleDestroy(): Promise<void> {
    if (this.redisClient.status === 'end') {
      return;
    }

    try {
      await this.redisClient.quit();
    } catch {
      this.redisClient.disconnect();
    }
  }
}

