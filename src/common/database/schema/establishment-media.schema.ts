import { index, integer, pgEnum, pgTable, timestamp, uuid, varchar } from 'drizzle-orm/pg-core';

import { establishments } from './establishments.schema';

export const establishmentMediaTypeEnum = pgEnum('establishment_media_type', ['image', 'video']);

export const establishmentMedia = pgTable(
  'establishment_media',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    establishmentId: uuid('establishment_id')
      .notNull()
      .references(() => establishments.id, { onDelete: 'cascade' }),
    type: establishmentMediaTypeEnum('type').notNull(),
    url: varchar('url', { length: 500 }).notNull(),
    publicId: varchar('public_id', { length: 255 }),
    format: varchar('format', { length: 40 }),
    bytes: integer('bytes'),
    sortOrder: integer('sort_order').default(0).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    establishmentMediaEstablishmentIdx: index('establishment_media_establishment_idx').on(
      table.establishmentId,
    ),
    establishmentMediaTypeIdx: index('establishment_media_type_idx').on(table.type),
  }),
);

export type EstablishmentMedia = typeof establishmentMedia.$inferSelect;
export type NewEstablishmentMedia = typeof establishmentMedia.$inferInsert;
