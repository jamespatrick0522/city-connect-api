import { index, pgEnum, pgTable, text, timestamp, uuid, varchar } from 'drizzle-orm/pg-core';
import { establishments } from './establishments.schema';
import { users } from './users.schema';

export const messageSenderRoleEnum = pgEnum('message_sender_role', ['tourist', 'establishment']);

export const messages = pgTable(
  'messages',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id').references(() => users.id, { onDelete: 'set null' }),
    establishmentId: uuid('establishment_id')
      .notNull()
      .references(() => establishments.id, { onDelete: 'cascade' }),
    senderRole: messageSenderRoleEnum('sender_role').notNull(),
    guestFullName: varchar('guest_full_name', { length: 120 }),
    guestEmail: varchar('guest_email', { length: 255 }),
    guestPhone: varchar('guest_phone', { length: 30 }),
    message: text('message').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    messagesUserIdx: index('messages_user_idx').on(table.userId),
    messagesEstablishmentIdx: index('messages_establishment_idx').on(table.establishmentId),
    messagesGuestEmailIdx: index('messages_guest_email_idx').on(table.guestEmail),
    messagesGuestPhoneIdx: index('messages_guest_phone_idx').on(table.guestPhone),
  }),
);

export type Message = typeof messages.$inferSelect;
export type NewMessage = typeof messages.$inferInsert;
