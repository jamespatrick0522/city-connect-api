import { index, pgEnum, pgTable, timestamp, uuid, varchar } from 'drizzle-orm/pg-core';

import { establishments } from './establishments.schema';
import { users } from './users.schema';

export const voiceCallStatusEnum = pgEnum('voice_call_status', [
  'ringing',
  'accepted',
  'rejected',
  'missed',
  'ended',
]);

export const voiceCalls = pgTable(
  'voice_calls',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    establishmentId: uuid('establishment_id')
      .notNull()
      .references(() => establishments.id, { onDelete: 'cascade' }),
    guestFullName: varchar('guest_full_name', { length: 120 }).notNull(),
    guestEmail: varchar('guest_email', { length: 255 }),
    guestPhone: varchar('guest_phone', { length: 30 }),
    status: voiceCallStatusEnum('status').default('ringing').notNull(),
    provider: varchar('provider', { length: 40 }).default('agora').notNull(),
    channelName: varchar('channel_name', { length: 120 }).notNull(),
    touristUid: varchar('tourist_uid', { length: 120 }).notNull(),
    establishmentUid: varchar('establishment_uid', { length: 120 }).notNull(),
    acceptedByUserId: uuid('accepted_by_user_id').references(() => users.id, {
      onDelete: 'set null',
    }),
    rejectedByUserId: uuid('rejected_by_user_id').references(() => users.id, {
      onDelete: 'set null',
    }),
    startedAt: timestamp('started_at', { withTimezone: true }).defaultNow().notNull(),
    acceptedAt: timestamp('accepted_at', { withTimezone: true }),
    endedAt: timestamp('ended_at', { withTimezone: true }),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    voiceCallsEstablishmentIdx: index('voice_calls_establishment_idx').on(table.establishmentId),
    voiceCallsStatusIdx: index('voice_calls_status_idx').on(table.status),
    voiceCallsCreatedIdx: index('voice_calls_created_idx').on(table.createdAt),
  }),
);

export type VoiceCall = typeof voiceCalls.$inferSelect;
export type NewVoiceCall = typeof voiceCalls.$inferInsert;
