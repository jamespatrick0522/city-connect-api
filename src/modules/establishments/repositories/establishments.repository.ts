import { Inject, Injectable } from '@nestjs/common';
import { SQL, and, desc, eq, ilike, or } from 'drizzle-orm';

import { TOKENS } from '../../../common/constants/tokens';
import { AppDb } from '../../../common/database/database.types';
import { BaseRepository } from '../../../common/database/repositories/base.repository';
import { establishments } from '../../../common/database/schema';
import { SearchEstablishmentsDto } from '../dto/establishments.dto';

@Injectable()
export class EstablishmentsRepository extends BaseRepository<typeof establishments> {
  constructor(@Inject(TOKENS.DRIZZLE_DB) db: AppDb) {
    super(db, establishments);
  }

  private buildFilters(query: SearchEstablishmentsDto): SQL<unknown> | undefined {
    const filters: SQL<unknown>[] = [];

    if (query.city?.trim()) {
      filters.push(eq(establishments.city, query.city.trim()));
    }

    if (query.category) {
      filters.push(eq(establishments.category, query.category));
    }

    if (typeof query.openNow === 'boolean') {
      filters.push(eq(establishments.isOpenNow, query.openNow));
    }

    if (query.listingStatus) {
      filters.push(eq(establishments.listingStatus, query.listingStatus));
    } else {
      filters.push(eq(establishments.listingStatus, 'verified'));
    }

    if (query.search?.trim()) {
      const q = `%${query.search.trim()}%`;
      filters.push(
        or(
          ilike(establishments.name, q),
          ilike(establishments.description, q),
          ilike(establishments.address, q),
        ) as SQL<unknown>,
      );
    }

    if (!filters.length) {
      return undefined;
    }

    return filters.length === 1 ? filters[0] : and(...filters);
  }

  async search(query: SearchEstablishmentsDto) {
    const page = Math.max(1, query.page || 1);
    const pageSize = Math.min(100, Math.max(1, query.pageSize || 12));
    const offset = (page - 1) * pageSize;
    const where = this.buildFilters(query);

    const [rows, total] = await Promise.all([
      this.findMany({
        where,
        limit: pageSize,
        offset,
        orderBy: desc(establishments.createdAt),
      }),
      this.count(where),
    ]);

    return {
      data: rows,
      meta: {
        page,
        pageSize,
        total,
        totalPages: Math.max(1, Math.ceil(total / pageSize)),
      },
    };
  }

  async listByOwner(
    ownerUserId: string,
    options: {
      listingStatus?: 'pending' | 'verified' | 'rejected';
      page: number;
      pageSize: number;
    },
  ) {
    const page = Math.max(1, options.page || 1);
    const pageSize = Math.min(100, Math.max(1, options.pageSize || 12));
    const offset = (page - 1) * pageSize;

    const filters: SQL<unknown>[] = [eq(establishments.ownerUserId, ownerUserId)];
    if (options.listingStatus) {
      filters.push(eq(establishments.listingStatus, options.listingStatus));
    }

    const where = filters.length === 1 ? filters[0] : (and(...filters) as SQL<unknown>);

    const [rows, total] = await Promise.all([
      this.findMany({
        where,
        limit: pageSize,
        offset,
        orderBy: desc(establishments.createdAt),
      }),
      this.count(where),
    ]);

    return {
      data: rows,
      meta: {
        page,
        pageSize,
        total,
        totalPages: Math.max(1, Math.ceil(total / pageSize)),
      },
    };
  }

  verifyListing(establishmentId: string, listingStatus: 'verified' | 'rejected', verifiedByUserId: string) {
    return this.update(eq(establishments.id, establishmentId), {
      listingStatus,
      verifiedByUserId,
      verifiedAt: new Date(),
      updatedAt: new Date(),
    });
  }

  updateBusinessStatus(
    establishmentId: string,
    payload: {
      businessStatus?: 'open' | 'closed' | 'temporarily_closed';
      isOpenNow?: boolean;
      statusNote?: string;
    },
  ) {
    return this.update(eq(establishments.id, establishmentId), {
      ...payload,
      updatedAt: new Date(),
    });
  }

  updateCoverPhoto(establishmentId: string, coverPhotoUrl: string) {
    return this.update(eq(establishments.id, establishmentId), {
      coverPhotoUrl,
      updatedAt: new Date(),
    });
  }

  countByListingStatus(listingStatus: 'pending' | 'verified' | 'rejected', city?: string) {
    const filters: SQL<unknown>[] = [eq(establishments.listingStatus, listingStatus)];

    if (city?.trim()) {
      filters.push(eq(establishments.city, city.trim()));
    }

    const where = filters.length === 1 ? filters[0] : and(...filters);
    return this.count(where);
  }
}
