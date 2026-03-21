import { Inject, Injectable } from '@nestjs/common';
import { SQL, and, desc, eq, gte, isNull, lte, or } from 'drizzle-orm';

import { TOKENS } from '../../../common/constants/tokens';
import { AppDb } from '../../../common/database/database.types';
import { BaseRepository } from '../../../common/database/repositories/base.repository';
import { announcements } from '../../../common/database/schema';

@Injectable()
export class AnnouncementsRepository extends BaseRepository<typeof announcements> {
  constructor(@Inject(TOKENS.DRIZZLE_DB) db: AppDb) {
    super(db, announcements);
  }

  private buildActiveFilter(city?: string): SQL<unknown> {
    const now = new Date();
    const filters: SQL<unknown>[] = [];

    if (city?.trim()) {
      filters.push(eq(announcements.city, city.trim()));
    }

    // Active window logic:
    // (startsAt is null OR startsAt <= now) AND (endsAt is null OR endsAt >= now)
    filters.push(
      and(
        or(isNull(announcements.startsAt), lte(announcements.startsAt, now)),
        or(isNull(announcements.endsAt), gte(announcements.endsAt, now)),
      ) as SQL<unknown>,
    );

    return filters.length === 1 ? filters[0] : (and(...filters) as SQL<unknown>);
  }

  async list(city?: string, limit = 20) {
    const where = this.buildActiveFilter(city);

    return this.findMany({
      where,
      limit,
      offset: 0,
      orderBy: desc(announcements.createdAt),
    });
  }

  countActive(city?: string) {
    return this.count(this.buildActiveFilter(city));
  }
}
