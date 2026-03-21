import { index, pgTable, timestamp, uniqueIndex, uuid } from 'drizzle-orm/pg-core';
import { establishments } from './establishments.schema';
import { users } from './users.schema';

export const favorites = pgTable(
  'favorites',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    establishmentId: uuid('establishment_id')
      .notNull()
      .references(() => establishments.id, { onDelete: 'cascade' }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    favoritesUserIdx: index('favorites_user_idx').on(table.userId),
    favoritesEstablishmentIdx: index('favorites_establishment_idx').on(table.establishmentId),
    favoritesUnique: uniqueIndex('favorites_user_establishment_unique').on(
      table.userId,
      table.establishmentId,
    ),
  }),
);

export type Favorite = typeof favorites.$inferSelect;
export type NewFavorite = typeof favorites.$inferInsert;
