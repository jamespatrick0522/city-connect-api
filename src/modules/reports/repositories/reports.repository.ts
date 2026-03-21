import { Inject, Injectable } from '@nestjs/common';
import { desc, eq } from 'drizzle-orm';

import { TOKENS } from '../../../common/constants/tokens';
import { AppDb } from '../../../common/database/database.types';
import { BaseRepository } from '../../../common/database/repositories/base.repository';
import { reports } from '../../../common/database/schema';

@Injectable()
export class ReportsRepository extends BaseRepository<typeof reports> {
  constructor(@Inject(TOKENS.DRIZZLE_DB) db: AppDb) {
    super(db, reports);
  }

  list(status: 'open' | 'resolved' | undefined, limit: number) {
    return this.findMany({
      where: status ? eq(reports.status, status) : undefined,
      limit,
      offset: 0,
      orderBy: desc(reports.createdAt),
    });
  }

  resolve(reportId: string, resolvedByUserId: string) {
    return this.update(eq(reports.id, reportId), {
      status: 'resolved',
      resolvedByUserId,
      resolvedAt: new Date(),
      updatedAt: new Date(),
    });
  }

  countByStatus(status: 'open' | 'resolved') {
    return this.count(eq(reports.status, status));
  }
}
