import { Global, Inject, Module, OnModuleDestroy } from '@nestjs/common';
import postgres from 'postgres';

import { TOKENS } from '../constants/tokens';
import { drizzleProvider } from './drizzle.provider';

@Global()
@Module({
  providers: [...drizzleProvider],
  exports: [TOKENS.DRIZZLE_DB, TOKENS.SQL_CLIENT],
})
export class DatabaseModule implements OnModuleDestroy {
  constructor(@Inject(TOKENS.SQL_CLIENT) private readonly sqlClient: postgres.Sql) {}

  async onModuleDestroy(): Promise<void> {
    await this.sqlClient.end({ timeout: 5 });
  }
}

