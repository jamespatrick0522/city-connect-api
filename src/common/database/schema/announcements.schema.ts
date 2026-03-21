import { index, pgTable, text, timestamp, uuid, varchar } from 'drizzle-orm/pg-core';
import { users } from './users.schema';

export const announcements = pgTable(
  'announcements',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    city: varchar('city', { length: 120 }).notNull(),
    title: varchar('title', { length: 180 }).notNull(),
    content: text('content').notNull(),
    publishedByUserId: uuid('published_by_user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'restrict' }),
    startsAt: timestamp('starts_at', { withTimezone: true }),
    endsAt: timestamp('ends_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    announcementsCityIdx: index('announcements_city_idx').on(table.city),
    announcementsCreatedIdx: index('announcements_created_idx').on(table.createdAt),
  }),
);

export type Announcement = typeof announcements.$inferSelect;
export type NewAnnouncement = typeof announcements.$inferInsert;
