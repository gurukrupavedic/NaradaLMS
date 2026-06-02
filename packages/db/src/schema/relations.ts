import { relations } from 'drizzle-orm'

import { user, session, account, organization, member, invitation } from './auth'
import {
  track,
  chapter,
  segment,
  audioAsset,
  audioMapping,
  batch,
  enrollment,
  evaluation,
  exam,
} from './school'

// ─── Auth relations ───────────────────────────────────────────────────────────

export const userRelations = relations(user, ({ many }) => ({
  sessions: many(session),
  accounts: many(account),
  members: many(member),
  invitations: many(invitation),
  enrollments: many(enrollment),
}))

export const sessionRelations = relations(session, ({ one }) => ({
  user: one(user, { fields: [session.userId], references: [user.id] }),
}))

export const accountRelations = relations(account, ({ one }) => ({
  user: one(user, { fields: [account.userId], references: [user.id] }),
}))

export const organizationRelations = relations(organization, ({ many }) => ({
  members: many(member),
  invitations: many(invitation),
}))

export const memberRelations = relations(member, ({ one }) => ({
  organization: one(organization, { fields: [member.organizationId], references: [organization.id] }),
  user: one(user, { fields: [member.userId], references: [user.id] }),
}))

export const invitationRelations = relations(invitation, ({ one }) => ({
  organization: one(organization, { fields: [invitation.organizationId], references: [organization.id] }),
  user: one(user, { fields: [invitation.inviterId], references: [user.id] }),
}))

// ─── School relations ─────────────────────────────────────────────────────────

export const trackRelations = relations(track, ({ many }) => ({
  chapters: many(chapter),
  batches: many(batch),
}))

export const chapterRelations = relations(chapter, ({ one, many }) => ({
  track: one(track, { fields: [chapter.trackId], references: [track.id] }),
  segments: many(segment),
  audioAssets: many(audioAsset),
  evaluations: many(evaluation),
}))

export const segmentRelations = relations(segment, ({ one, many }) => ({
  chapter: one(chapter, { fields: [segment.chapterId], references: [chapter.id] }),
  audioMappings: many(audioMapping),
}))

export const audioAssetRelations = relations(audioAsset, ({ one, many }) => ({
  chapter: one(chapter, { fields: [audioAsset.chapterId], references: [chapter.id] }),
  audioMappings: many(audioMapping),
}))

export const audioMappingRelations = relations(audioMapping, ({ one }) => ({
  segment: one(segment, { fields: [audioMapping.segmentId], references: [segment.id] }),
  audioAsset: one(audioAsset, { fields: [audioMapping.audioAssetId], references: [audioAsset.id] }),
}))

export const batchRelations = relations(batch, ({ one, many }) => ({
  track: one(track, { fields: [batch.trackId], references: [track.id] }),
  enrollments: many(enrollment),
}))

export const enrollmentRelations = relations(enrollment, ({ one }) => ({
  batch: one(batch, { fields: [enrollment.batchId], references: [batch.id] }),
  user: one(user, { fields: [enrollment.userId], references: [user.id] }),
}))

export const evaluationRelations = relations(evaluation, ({ one }) => ({
  chapter: one(chapter, { fields: [evaluation.chapterId], references: [chapter.id] }),
}))

export const examRelations = relations(exam, ({ one }) => ({
  chapter: one(chapter, { fields: [exam.chapterId], references: [chapter.id] }),
  evaluation: one(evaluation, { fields: [exam.evaluationId], references: [evaluation.id] }),
}))
