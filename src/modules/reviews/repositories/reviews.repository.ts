import { Inject, Injectable } from '@nestjs/common';
import { asc, desc, eq, sql } from 'drizzle-orm';

import { TOKENS } from '../../../common/constants/tokens';
import { AppDb } from '../../../common/database/database.types';
import { BaseRepository } from '../../../common/database/repositories/base.repository';
import { reviews } from '../../../common/database/schema';

@Injectable()
export class ReviewsRepository extends BaseRepository<typeof reviews> {
  constructor(@Inject(TOKENS.DRIZZLE_DB) db: AppDb) {
    super(db, reviews);
  }

  listByEstablishment(
    establishmentId: string,
    options: {
      sort: 'recent' | 'highest' | 'lowest';
      limit: number;
      offset: number;
    },
  ) {
    const orderBy =
      options.sort === 'highest'
        ? desc(reviews.rating)
        : options.sort === 'lowest'
          ? asc(reviews.rating)
          : desc(reviews.createdAt);

    return this.findMany({
      where: eq(reviews.establishmentId, establishmentId),
      limit: options.limit,
      offset: options.offset,
      orderBy,
    });
  }

  countByEstablishment(establishmentId: string) {
    return this.count(eq(reviews.establishmentId, establishmentId));
  }

  async getSummary(establishmentId: string) {
    const [summaryRow, breakdownRows] = await Promise.all([
      this.db
        .select({
          totalReviews: sql<number>`count(*)`,
          averageRating: sql<number>`coalesce(avg(${reviews.rating}), 0)`,
        })
        .from(reviews)
        .where(eq(reviews.establishmentId, establishmentId)),
      this.db
        .select({
          rating: reviews.rating,
          count: sql<number>`count(*)`,
        })
        .from(reviews)
        .where(eq(reviews.establishmentId, establishmentId))
        .groupBy(reviews.rating),
    ]);

    const ratingBreakdown = {
      1: 0,
      2: 0,
      3: 0,
      4: 0,
      5: 0,
    };

    breakdownRows.forEach((row) => {
      const rating = Number(row.rating) as 1 | 2 | 3 | 4 | 5;
      ratingBreakdown[rating] = Number(row.count ?? 0);
    });

    const totalReviews = Number(summaryRow[0]?.totalReviews ?? 0);
    const averageRating = Number(Number(summaryRow[0]?.averageRating ?? 0).toFixed(1));

    return {
      totalReviews,
      averageRating,
      ratingBreakdown,
    };
  }
}
