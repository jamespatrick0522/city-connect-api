import { Inject, Injectable } from '@nestjs/common';
import { and, desc, eq } from 'drizzle-orm';

import { TOKENS } from '../../../common/constants/tokens';
import { AppDb } from '../../../common/database/database.types';
import { BaseRepository } from '../../../common/database/repositories/base.repository';
import { favorites } from '../../../common/database/schema';

@Injectable()
export class FavoritesRepository extends BaseRepository<typeof favorites> {
  constructor(@Inject(TOKENS.DRIZZLE_DB) db: AppDb) {
    super(db, favorites);
  }

  findByUser(userId: string, limit: number, offset: number) {
    return this.findMany({
      where: eq(favorites.userId, userId),
      limit,
      offset,
      orderBy: desc(favorites.createdAt),
    });
  }

  countByUser(userId: string) {
    return this.count(eq(favorites.userId, userId));
  }

  findByUserAndEstablishment(userId: string, establishmentId: string) {
    return this.findOne(
      and(eq(favorites.userId, userId), eq(favorites.establishmentId, establishmentId))!,
    );
  }
}
