import { Inject, Injectable } from '@nestjs/common';
import { desc, eq } from 'drizzle-orm';

import { TOKENS } from '../../../common/constants/tokens';
import { AppDb } from '../../../common/database/database.types';
import { BaseRepository } from '../../../common/database/repositories/base.repository';
import { voiceCalls } from '../../../common/database/schema';

@Injectable()
export class CallsRepository extends BaseRepository<typeof voiceCalls> {
  constructor(@Inject(TOKENS.DRIZZLE_DB) db: AppDb) {
    super(db, voiceCalls);
  }

  updateStatus(
    callId: string,
    payload: Partial<{
      status: 'ringing' | 'accepted' | 'rejected' | 'missed' | 'ended';
      acceptedByUserId: string | null;
      rejectedByUserId: string | null;
      acceptedAt: Date | null;
      endedAt: Date | null;
    }>,
  ) {
    return this.update(eq(voiceCalls.id, callId), {
      ...payload,
      updatedAt: new Date(),
    });
  }

  listByEstablishment(establishmentId: string, limit = 50) {
    return this.findMany({
      where: eq(voiceCalls.establishmentId, establishmentId),
      limit,
      offset: 0,
      orderBy: desc(voiceCalls.createdAt),
    });
  }
}
