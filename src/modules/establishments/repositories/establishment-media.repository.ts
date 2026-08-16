import { Inject, Injectable } from '@nestjs/common';
import { and, asc, eq } from 'drizzle-orm';

import { TOKENS } from '../../../common/constants/tokens';
import { AppDb } from '../../../common/database/database.types';
import { BaseRepository } from '../../../common/database/repositories/base.repository';
import { establishmentMedia } from '../../../common/database/schema';

@Injectable()
export class EstablishmentMediaRepository extends BaseRepository<typeof establishmentMedia> {
  constructor(@Inject(TOKENS.DRIZZLE_DB) db: AppDb) {
    super(db, establishmentMedia);
  }

  listByEstablishment(establishmentId: string) {
    return this.findMany({
      where: eq(establishmentMedia.establishmentId, establishmentId),
      orderBy: asc(establishmentMedia.sortOrder),
    });
  }

  async countByType(establishmentId: string, type: 'image' | 'video') {
    return this.count(and(eq(establishmentMedia.establishmentId, establishmentId), eq(establishmentMedia.type, type)));
  }

  deleteById(mediaId: string) {
    return this.delete(eq(establishmentMedia.id, mediaId));
  }
}

