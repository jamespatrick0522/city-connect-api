import { Provider } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';

import { TOKENS } from '../constants/tokens';
import { AppDb } from './database.types';
import * as schema from './schema';

export const drizzleProvider: Provider[] = [
  {
    provide: TOKENS.SQL_CLIENT,
    inject: [ConfigService],
    useFactory: (configService: ConfigService): postgres.Sql =>
      postgres(configService.getOrThrow<string>('app.databaseUrl'), {
        max: 30,
        idle_timeout: 20,
        connect_timeout: 10,
        prepare: false,
      }),
  },
  {
    provide: TOKENS.DRIZZLE_DB,
    inject: [TOKENS.SQL_CLIENT],
    useFactory: (sqlClient: postgres.Sql): AppDb => drizzle(sqlClient, { schema }),
  },
];

