import { Inject, Injectable } from '@nestjs/common';
import { eq, ilike, or } from 'drizzle-orm';

import { TOKENS } from '../../../common/constants/tokens';
import { AppDb } from '../../../common/database/database.types';
import { BaseRepository } from '../../../common/database/repositories/base.repository';
import { users } from '../../../common/database/schema';

@Injectable()
export class UsersRepository extends BaseRepository<typeof users> {
  constructor(@Inject(TOKENS.DRIZZLE_DB) db: AppDb) {
    super(db, users);
  }

  findByEmail(email: string) {
    return this.findOne(eq(users.email, email));
  }

  search(search: string, limit: number, offset: number) {
    const q = `%${search.trim()}%`;

    return this.findMany({
      where: or(ilike(users.firstName, q), ilike(users.lastName, q), ilike(users.email, q)),
      limit,
      offset,
      orderBy: users.createdAt,
    });
  }

  countBySearch(search: string) {
    const q = `%${search.trim()}%`;
    return this.count(or(ilike(users.firstName, q), ilike(users.lastName, q), ilike(users.email, q)));
  }

  updateAvatar(userId: string, avatarUrl: string) {
    return this.update(eq(users.id, userId), { avatarUrl, updatedAt: new Date() });
  }
}

