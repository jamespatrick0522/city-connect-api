import { relations } from 'drizzle-orm';

import { announcements } from './announcements.schema';
import { establishmentMedia } from './establishment-media.schema';
import { establishments } from './establishments.schema';
import { favorites } from './favorites.schema';
import { messages } from './messages.schema';
import { reports } from './reports.schema';
import { reviews } from './reviews.schema';
import { users } from './users.schema';
import { voiceCalls } from './calls.schema';

export const usersRelations = relations(users, ({ many }) => ({
  ownedEstablishments: many(establishments, {
    relationName: 'EstablishmentOwner',
  }),
  verifiedEstablishments: many(establishments, {
    relationName: 'EstablishmentVerifier',
  }),
  favorites: many(favorites),
  messages: many(messages),
  publishedAnnouncements: many(announcements),
  submittedReports: many(reports, {
    relationName: 'ReporterUser',
  }),
  resolvedReports: many(reports, {
    relationName: 'ReportResolver',
  }),
}));

export const establishmentsRelations = relations(establishments, ({ one, many }) => ({
  owner: one(users, {
    fields: [establishments.ownerUserId],
    references: [users.id],
    relationName: 'EstablishmentOwner',
  }),
  verifiedBy: one(users, {
    fields: [establishments.verifiedByUserId],
    references: [users.id],
    relationName: 'EstablishmentVerifier',
  }),
  favorites: many(favorites),
  messages: many(messages),
  media: many(establishmentMedia),
  voiceCalls: many(voiceCalls),
  reports: many(reports),
  reviews: many(reviews),
}));

export const establishmentMediaRelations = relations(establishmentMedia, ({ one }) => ({
  establishment: one(establishments, {
    fields: [establishmentMedia.establishmentId],
    references: [establishments.id],
  }),
}));

export const voiceCallsRelations = relations(voiceCalls, ({ one }) => ({
  establishment: one(establishments, {
    fields: [voiceCalls.establishmentId],
    references: [establishments.id],
  }),
  acceptedBy: one(users, {
    fields: [voiceCalls.acceptedByUserId],
    references: [users.id],
    relationName: 'VoiceCallAcceptedBy',
  }),
  rejectedBy: one(users, {
    fields: [voiceCalls.rejectedByUserId],
    references: [users.id],
    relationName: 'VoiceCallRejectedBy',
  }),
}));

export const favoritesRelations = relations(favorites, ({ one }) => ({
  user: one(users, {
    fields: [favorites.userId],
    references: [users.id],
  }),
  establishment: one(establishments, {
    fields: [favorites.establishmentId],
    references: [establishments.id],
  }),
}));

export const messagesRelations = relations(messages, ({ one }) => ({
  user: one(users, {
    fields: [messages.userId],
    references: [users.id],
  }),
  establishment: one(establishments, {
    fields: [messages.establishmentId],
    references: [establishments.id],
  }),
}));

export const announcementsRelations = relations(announcements, ({ one }) => ({
  publishedBy: one(users, {
    fields: [announcements.publishedByUserId],
    references: [users.id],
  }),
}));

export const reportsRelations = relations(reports, ({ one }) => ({
  reporter: one(users, {
    fields: [reports.reporterUserId],
    references: [users.id],
    relationName: 'ReporterUser',
  }),
  establishment: one(establishments, {
    fields: [reports.establishmentId],
    references: [establishments.id],
  }),
  resolvedBy: one(users, {
    fields: [reports.resolvedByUserId],
    references: [users.id],
    relationName: 'ReportResolver',
  }),
}));

export const reviewsRelations = relations(reviews, ({ one }) => ({
  establishment: one(establishments, {
    fields: [reviews.establishmentId],
    references: [establishments.id],
  }),
}));


