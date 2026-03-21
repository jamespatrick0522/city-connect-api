import { Inject, Injectable } from '@nestjs/common';
import { and, asc, desc, eq, or } from 'drizzle-orm';

import { TOKENS } from '../../../common/constants/tokens';
import { AppDb } from '../../../common/database/database.types';
import { BaseRepository } from '../../../common/database/repositories/base.repository';
import { messages } from '../../../common/database/schema';

@Injectable()
export class MessagesRepository extends BaseRepository<typeof messages> {
  constructor(@Inject(TOKENS.DRIZZLE_DB) db: AppDb) {
    super(db, messages);
  }

  listGuestConversation(
    establishmentId: string,
    guestEmail: string | undefined,
    guestPhone: string | undefined,
    limit: number,
    offset: number,
  ) {
    return this.findMany({
      where: and(
        eq(messages.establishmentId, establishmentId),
        this.buildGuestIdentifierFilter(guestEmail, guestPhone),
      )!,
      limit,
      offset,
      orderBy: asc(messages.createdAt),
    });
  }

  countGuestConversation(
    establishmentId: string,
    guestEmail: string | undefined,
    guestPhone: string | undefined,
  ) {
    return this.count(
      and(
        eq(messages.establishmentId, establishmentId),
        this.buildGuestIdentifierFilter(guestEmail, guestPhone),
      )!,
    );
  }

  listRecentByEstablishment(establishmentId: string, limit: number) {
    return this.findMany({
      where: eq(messages.establishmentId, establishmentId),
      limit,
      offset: 0,
      orderBy: desc(messages.createdAt),
    });
  }

  private buildGuestIdentifierFilter(guestEmail?: string, guestPhone?: string) {
    if (guestEmail && guestPhone) {
      return or(eq(messages.guestEmail, guestEmail), eq(messages.guestPhone, guestPhone));
    }

    if (guestEmail) {
      return eq(messages.guestEmail, guestEmail);
    }

    return eq(messages.guestPhone, guestPhone!);
  }
}
