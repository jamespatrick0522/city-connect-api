import {
  boolean,
  decimal,
  index,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';
import { users } from './users.schema';

export const establishmentCategoryEnum = pgEnum('establishment_category', [
  'tourist_spot',
  'restaurant',
  'clinic_hospital',
  'mall',
  'other',
]);

export const listingStatusEnum = pgEnum('listing_status', ['pending', 'verified', 'rejected']);
export const businessStatusEnum = pgEnum('business_status', ['open', 'closed', 'temporarily_closed']);

export const establishments = pgTable(
  'establishments',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    ownerUserId: uuid('owner_user_id').references(() => users.id, { onDelete: 'set null' }),
    city: varchar('city', { length: 120 }).notNull(),
    name: varchar('name', { length: 160 }).notNull(),
    description: text('description'),
    category: establishmentCategoryEnum('category').notNull(),
    services: text('services'),
    contactNumber: varchar('contact_number', { length: 30 }),
    email: varchar('email', { length: 255 }),
    address: varchar('address', { length: 255 }).notNull(),
    latitude: decimal('latitude', { precision: 10, scale: 7 }),
    longitude: decimal('longitude', { precision: 10, scale: 7 }),
    opensAt: varchar('opens_at', { length: 8 }),
    closesAt: varchar('closes_at', { length: 8 }),
    isOpenNow: boolean('is_open_now').default(false).notNull(),
    coverPhotoUrl: varchar('cover_photo_url', { length: 500 }),
    listingStatus: listingStatusEnum('listing_status').default('pending').notNull(),
    businessStatus: businessStatusEnum('business_status').default('closed').notNull(),
    statusNote: varchar('status_note', { length: 255 }),
    verifiedByUserId: uuid('verified_by_user_id').references(() => users.id, {
      onDelete: 'set null',
    }),
    verifiedAt: timestamp('verified_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    establishmentsCityIdx: index('establishments_city_idx').on(table.city),
    establishmentsCategoryIdx: index('establishments_category_idx').on(table.category),
    establishmentsListingStatusIdx: index('establishments_listing_status_idx').on(table.listingStatus),
    establishmentsOpenIdx: index('establishments_open_idx').on(table.isOpenNow),
  }),
);

export type Establishment = typeof establishments.$inferSelect;
export type NewEstablishment = typeof establishments.$inferInsert;
