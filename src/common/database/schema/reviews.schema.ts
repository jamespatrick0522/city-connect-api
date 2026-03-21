import { boolean, index, integer, pgTable, text, timestamp, uuid, varchar } from 'drizzle-orm/pg-core';

import { establishments } from './establishments.schema';

export const reviews = pgTable(
  'reviews',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    establishmentId: uuid('establishment_id')
      .notNull()
      .references(() => establishments.id, { onDelete: 'cascade' }),
    reviewerName: varchar('reviewer_name', { length: 120 }),
    reviewerAlias: varchar('reviewer_alias', { length: 120 }),
    isAnonymous: boolean('is_anonymous').default(false).notNull(),
    rating: integer('rating').notNull(),
    comment: text('comment').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    reviewsEstablishmentIdx: index('reviews_establishment_idx').on(table.establishmentId),
    reviewsCreatedIdx: index('reviews_created_idx').on(table.createdAt),
    reviewsRatingIdx: index('reviews_rating_idx').on(table.rating),
  }),
);

export type Review = typeof reviews.$inferSelect;
export type NewReview = typeof reviews.$inferInsert;
