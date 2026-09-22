import { relations } from 'drizzle-orm'

import { user, session, account, organization, member, invitation, deviceLinkCode } from './auth'
import {
  course,
  track,
  chapter,
  chapterScript,
  segment,
  chapterScriptSegment,
  audioAsset,
  audioMapping,
  batch,
  batchClassSlot,
  enrollment,
  enrollmentRequest,
  evaluation,
  exam,
  examResult,
  profile,
} from './school'

// ─── Auth relations ───────────────────────────────────────────────────────────

export const userRelations = relations(user, ({ many }) => ({
  sessions: many(session),
  accounts: many(account),
  members: many(member),
  invitations: many(invitation),
  deviceLinkCodes: many(deviceLinkCode),
}))

export const sessionRelations = relations(session, ({ one }) => ({
  user: one(user, { fields: [session.userId], references: [user.id] }),
}))

export const deviceLinkCodeRelations = relations(deviceLinkCode, ({ one }) => ({
  user: one(user, { fields: [deviceLinkCode.userId], references: [user.id] }),
  claimedSession: one(session, { fields: [deviceLinkCode.claimedSessionId], references: [session.id] }),
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

export const profileRelations = relations(profile, ({ many }) => ({
  enrollments: many(enrollment),
}))

export const courseRelations = relations(course, ({ many }) => ({
  tracks: many(track),
}))

export const trackRelations = relations(track, ({ one, many }) => ({
  course: one(course, { fields: [track.courseId], references: [course.id] }),
  chapters: many(chapter),
  batches: many(batch),
}))

export const chapterRelations = relations(chapter, ({ one, many }) => ({
  track: one(track, { fields: [chapter.trackId], references: [track.id] }),
  evaluations: many(evaluation),
  scripts: many(chapterScript),
  segments: many(segment),
  audioAssets: many(audioAsset),
}))

export const chapterScriptRelations = relations(chapterScript, ({ one, many }) => ({
  chapter: one(chapter, { fields: [chapterScript.chapterId], references: [chapter.id] }),
  scriptSegments: many(chapterScriptSegment),
}))

export const segmentRelations = relations(segment, ({ one, many }) => ({
  chapter: one(chapter, { fields: [segment.chapterId], references: [chapter.id] }),
  scriptSegments: many(chapterScriptSegment),
  audioMappings: many(audioMapping),
}))

export const chapterScriptSegmentRelations = relations(chapterScriptSegment, ({ one }) => ({
  chapterScript: one(chapterScript, {
    fields: [chapterScriptSegment.chapterScriptId],
    references: [chapterScript.id],
  }),
  segment: one(segment, { fields: [chapterScriptSegment.segmentId], references: [segment.id] }),
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
  classSlots: many(batchClassSlot),
}))

export const batchClassSlotRelations = relations(batchClassSlot, ({ one }) => ({
  batch: one(batch, { fields: [batchClassSlot.batchId], references: [batch.id] }),
}))

export const enrollmentRelations = relations(enrollment, ({ one }) => ({
  profile: one(profile, { fields: [enrollment.profileId], references: [profile.id] }),
  batch: one(batch, { fields: [enrollment.batchId], references: [batch.id] }),
}))

export const enrollmentRequestRelations = relations(enrollmentRequest, ({ one }) => ({
  profile: one(profile, {
    fields: [enrollmentRequest.profileId],
    references: [profile.id],
    relationName: 'enrollmentRequestApplicant',
  }),
  batch: one(batch, { fields: [enrollmentRequest.batchId], references: [batch.id] }),
  reviewer: one(profile, {
    fields: [enrollmentRequest.reviewedBy],
    references: [profile.id],
    relationName: 'enrollmentRequestReviewer',
  }),
}))

export const evaluationRelations = relations(evaluation, ({ one }) => ({
  chapter: one(chapter, { fields: [evaluation.chapterId], references: [chapter.id] }),
}))

export const examRelations = relations(exam, ({ one }) => ({
  track: one(track, { fields: [exam.trackId], references: [track.id] }),
  result: one(examResult),
  // The admin exams screen's own name/batch-code columns — eager-loaded directly here rather
  // than the caller cross-referencing a separate "every batch's roster" fetch (which is itself
  // paginated and can be incomplete for a large school).
  student: one(profile, { fields: [exam.studentId], references: [profile.id] }),
  batch: one(batch, { fields: [exam.batchId], references: [batch.id] }),
}))

export const examResultRelations = relations(examResult, ({ one }) => ({
  exam: one(exam, { fields: [examResult.examId], references: [exam.id] }),
}))
