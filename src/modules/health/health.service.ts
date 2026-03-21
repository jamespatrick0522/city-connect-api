import { Inject, Injectable } from '@nestjs/common';
import { sql } from 'drizzle-orm';

import { TOKENS } from '../../common/constants/tokens';
import { AppDb } from '../../common/database/database.types';
import { AppLoggerService } from '../../common/logger/app-logger.service';
import { RedisService } from '../../common/redis/redis.service';

@Injectable()
export class HealthService {
  constructor(
    @Inject(TOKENS.DRIZZLE_DB) private readonly db: AppDb,
    private readonly redisService: RedisService,
    private readonly logger: AppLoggerService,
  ) {}

  async check() {
    const checks = await Promise.allSettled([
      this.db.execute(sql`select 1`),
      this.redisService.ping(),
    ]);

    const dbOk = checks[0].status === 'fulfilled';
    const redisOk = checks[1].status === 'fulfilled';
    const status = dbOk && redisOk ? 'ok' : 'degraded';

    if (status === 'degraded') {
      this.logger.warn('Healthcheck reported degraded dependencies.', 'HealthService');
    }

    return {
      status,
      timestamp: new Date().toISOString(),
      dependencies: {
        postgres: dbOk ? 'up' : 'down',
        redis: redisOk ? 'up' : 'down',
      },
    };
  }
}

