import {
  audioAsset,
  audioMapping,
  batch,
  batchClassSlot,
  chapter,
  chapterScript,
  chapterScriptSegment,
  enrollment,
  evaluation,
  exam,
  getSchoolDb,
  member,
  organization,
  profile,
  provisionSchool,
  publicDb,
  registration,
  schoolSchemaName,
  segment,
  session,
  stagedUpload,
  track,
  trackCertification,
  user,
  type SchoolDbClient,
} from '@narada/db'

import { newMemberId, newOrgId, newSessionId, newUserId } from './ids'

export type UserRow = typeof user.$inferSelect
export type MemberRow = typeof member.$inferSelect
export type SessionRow = typeof session.$inferSelect
export type ProfileRow = typeof profile.$inferSelect
export type TrackRow = typeof track.$inferSelect
export type ChapterRow = typeof chapter.$inferSelect
export type ChapterScriptRow = typeof chapterScript.$inferSelect
export type SegmentRow = typeof segment.$inferSelect
export type ChapterScriptSegmentRow = typeof chapterScriptSegment.$inferSelect
export type AudioAssetRow = typeof audioAsset.$inferSelect
export type AudioMappingRow = typeof audioMapping.$inferSelect
export type StagedUploadRow = typeof stagedUpload.$inferSelect
export type BatchRow = typeof batch.$inferSelect
export type BatchClassSlotRow = typeof batchClassSlot.$inferSelect
export type EnrollmentRow = typeof enrollment.$inferSelect
export type EvaluationRow = typeof evaluation.$inferSelect
export type ExamRow = typeof exam.$inferSelect
export type TrackCertificationRow = typeof trackCertification.$inferSelect
export type RegistrationRow = typeof registration.$inferSelect

export type TestWorld = {
  orgId: string
  schemaName: string
  schoolDb: SchoolDbClient
  createdSchemas: string[]
  createdPublicUserIds: string[]
  createdPublicOrgIds: string[]
  createdPublicMemberIds: string[]
}

let uniqueCounter = 0
/** Monotonic-ish per-process counter so repeated builder calls in one test never collide on a unique column. */
function nextUnique(): string {
  uniqueCounter += 1
  return `${Date.now().toString(36)}-${uniqueCounter}-${crypto.randomUUID().slice(0, 8)}`
}

/**
 * Provisions a brand-new, isolated school: inserts its `organization` row into the public schema,
 * calls the real `provisionSchool` (creates the `school-<orgId>` schema and applies real school
 * migrations), then opens its scoped `SchoolDbClient`. Everything created is recorded on the
 * returned `TestWorld` so `destroyTestWorld` can tear it down precisely.
 */
export async function createTestSchool(overrides?: {
  slug?: string
  name?: string
}): Promise<TestWorld> {
  const orgId = newOrgId()
  const schemaName = schoolSchemaName(orgId)
  const slug = overrides?.slug ?? `test-${orgId}`
  const name = overrides?.name ?? `Test School ${orgId}`

  await publicDb.insert(organization).values({
    id: orgId,
    name,
    slug,
    createdAt: new Date(),
  })

  // provisionSchool now tracks each school's applied migrations inside its own schema (see
  // packages/db/src/provision.ts), so this is safe to call many times per test run without the
  // cross-tenant migration-tracking collision this harness originally had to work around.
  await provisionSchool(orgId)
  const schoolDb = getSchoolDb(orgId)

  return {
    orgId,
    schemaName,
    schoolDb,
    createdSchemas: [schemaName],
    createdPublicUserIds: [],
    createdPublicOrgIds: [orgId],
    createdPublicMemberIds: [],
  }
}

// -- Public-schema builders ---------------------------------------------------

export async function createUser(
  world: TestWorld,
  overrides?: Partial<typeof user.$inferInsert>,
): Promise<UserRow> {
  const id = overrides?.id ?? newUserId()
  const rows = await publicDb
    .insert(user)
    .values({
      id,
      name: overrides?.name ?? `User ${id}`,
      email: overrides?.email ?? `${id}@example.test`,
      emailVerified: overrides?.emailVerified ?? true,
      isSuperAdmin: overrides?.isSuperAdmin ?? false,
      ...overrides,
    })
    .returning()

  const row = rows.at(0)
  if (!row) throw new Error('createUser: insert returned no row')
  world.createdPublicUserIds.push(row.id)
  return row
}

export async function createMembership(
  world: TestWorld,
  userId: string,
  overrides?: { role?: 'owner' | 'admin' | 'member'; id?: string },
): Promise<MemberRow> {
  const id = overrides?.id ?? newMemberId()
  const rows = await publicDb
    .insert(member)
    .values({
      id,
      organizationId: world.orgId,
      userId,
      role: overrides?.role ?? 'member',
      createdAt: new Date(),
    })
    .returning()

  const row = rows.at(0)
  if (!row) throw new Error('createMembership: insert returned no row')
  world.createdPublicMemberIds.push(row.id)
  return row
}

export async function createSession(
  world: TestWorld,
  userId: string,
  overrides?: Partial<typeof session.$inferInsert>,
): Promise<SessionRow> {
  const id = overrides?.id ?? newSessionId()
  const now = new Date()
  const rows = await publicDb
    .insert(session)
    .values({
      id,
      userId,
      token: overrides?.token ?? `token-${nextUnique()}`,
      expiresAt: overrides?.expiresAt ?? new Date(Date.now() + 24 * 60 * 60 * 1000),
      createdAt: overrides?.createdAt ?? now,
      updatedAt: overrides?.updatedAt ?? now,
      activeOrganizationId: overrides?.activeOrganizationId ?? world.orgId,
      ...overrides,
    })
    .returning()

  const row = rows.at(0)
  if (!row) throw new Error('createSession: insert returned no row')
  // Sessions cascade-delete with their user, so no separate tracking array is needed.
  return row
}

// -- School-schema builders ---------------------------------------------------

export async function createProfile(
  world: TestWorld,
  overrides?: { userId?: string; name?: string; phone?: string | null; city?: string | null },
): Promise<ProfileRow> {
  const rows = await world.schoolDb
    .insert(profile)
    .values({
      userId: overrides?.userId ?? newUserId(),
      name: overrides?.name ?? `Profile ${nextUnique()}`,
      phone: overrides?.phone ?? null,
      city: overrides?.city ?? null,
    })
    .returning()

  const row = rows.at(0)
  if (!row) throw new Error('createProfile: insert returned no row')
  return row
}

export async function createTrack(
  world: TestWorld,
  overrides?: { name?: string; order?: number },
): Promise<TrackRow> {
  const rows = await world.schoolDb
    .insert(track)
    .values({
      name: overrides?.name ?? `Track ${nextUnique()}`,
      order: overrides?.order ?? nextTrackOrder(),
    })
    .returning()

  const row = rows.at(0)
  if (!row) throw new Error('createTrack: insert returned no row')
  return row
}

let trackOrderCounter = 0
function nextTrackOrder(): number {
  trackOrderCounter += 1
  return trackOrderCounter
}

let chapterOrderCounter = 0
function nextChapterOrder(): number {
  chapterOrderCounter += 1
  return chapterOrderCounter
}

export async function createChapter(
  world: TestWorld,
  track_: TrackRow,
  overrides?: {
    code?: string
    title?: string
    status?: ChapterRow['status']
    order?: number
    script?: ChapterRow['script']
  },
): Promise<ChapterRow> {
  const rows = await world.schoolDb
    .insert(chapter)
    .values({
      trackId: track_.id,
      code: overrides?.code ?? `chapter-${nextUnique()}`,
      title: overrides?.title ?? `Chapter ${nextUnique()}`,
      status: overrides?.status ?? 'draft',
      order: overrides?.order ?? nextChapterOrder(),
      script: overrides?.script ?? null,
    })
    .returning()

  const row = rows.at(0)
  if (!row) throw new Error('createChapter: insert returned no row')
  return row
}

let scriptOrderCounter = 0
function nextScriptOrder(): number {
  scriptOrderCounter += 1
  return scriptOrderCounter
}

export async function createChapterScript(
  world: TestWorld,
  chapter_: ChapterRow,
  overrides?: {
    script?: ChapterScriptRow['script']
    label?: string
    shortLabel?: string
    fontClass?: string
    text?: string
    order?: number
  },
): Promise<ChapterScriptRow> {
  const rows = await world.schoolDb
    .insert(chapterScript)
    .values({
      chapterId: chapter_.id,
      script: overrides?.script ?? 'sa',
      label: overrides?.label ?? 'Devanagari',
      shortLabel: overrides?.shortLabel ?? 'SA',
      fontClass: overrides?.fontClass ?? 'font-deva',
      text: overrides?.text ?? `Text ${nextUnique()}`,
      order: overrides?.order ?? nextScriptOrder(),
    })
    .returning()

  const row = rows.at(0)
  if (!row) throw new Error('createChapterScript: insert returned no row')
  return row
}

let segmentOrderCounter = 0
function nextSegmentOrder(): number {
  segmentOrderCounter += 1
  return segmentOrderCounter
}

export async function createSegment(
  world: TestWorld,
  chapter_: ChapterRow,
  overrides?: { order?: number },
): Promise<SegmentRow> {
  const rows = await world.schoolDb
    .insert(segment)
    .values({
      chapterId: chapter_.id,
      order: overrides?.order ?? nextSegmentOrder(),
    })
    .returning()

  const row = rows.at(0)
  if (!row) throw new Error('createSegment: insert returned no row')
  return row
}

/** One script's own offsets (`start`/`end`) into its own text, for a segment shared across scripts. */
export async function createChapterScriptSegment(
  world: TestWorld,
  chapterScript_: ChapterScriptRow,
  segment_: SegmentRow,
  overrides: { start: number; end: number },
): Promise<ChapterScriptSegmentRow> {
  const rows = await world.schoolDb
    .insert(chapterScriptSegment)
    .values({
      chapterScriptId: chapterScript_.id,
      segmentId: segment_.id,
      start: overrides.start,
      end: overrides.end,
    })
    .returning()

  const row = rows.at(0)
  if (!row) throw new Error('createChapterScriptSegment: insert returned no row')
  return row
}

let audioAssetOrderCounter = 0
function nextAudioAssetOrder(): number {
  audioAssetOrderCounter += 1
  return audioAssetOrderCounter
}

export async function createAudioAsset(
  world: TestWorld,
  chapter_: ChapterRow,
  overrides?: {
    label?: string | null
    reciter?: string
    objectKey?: string
    duration?: number
    order?: number
  },
): Promise<AudioAssetRow> {
  const rows = await world.schoolDb
    .insert(audioAsset)
    .values({
      chapterId: chapter_.id,
      label: overrides?.label ?? null,
      reciter: overrides?.reciter ?? 'Test Reciter',
      objectKey: overrides?.objectKey ?? `schools/test/chapters/${chapter_.id}/audio/${nextUnique()}.mp3`,
      duration: overrides?.duration ?? 60,
      order: overrides?.order ?? nextAudioAssetOrder(),
    })
    .returning()

  const row = rows.at(0)
  if (!row) throw new Error('createAudioAsset: insert returned no row')
  return row
}

export async function createAudioMapping(
  world: TestWorld,
  segment_: SegmentRow,
  audioAsset_: AudioAssetRow,
  overrides: { audioStart: number; audioEnd: number },
): Promise<AudioMappingRow> {
  const rows = await world.schoolDb
    .insert(audioMapping)
    .values({
      segmentId: segment_.id,
      audioAssetId: audioAsset_.id,
      audioStart: overrides.audioStart,
      audioEnd: overrides.audioEnd,
    })
    .returning()

  const row = rows.at(0)
  if (!row) throw new Error('createAudioMapping: insert returned no row')
  return row
}

export async function createStagedUpload(
  world: TestWorld,
  chapter_: ChapterRow,
  overrides?: {
    purpose?: StagedUploadRow['purpose']
    status?: StagedUploadRow['status']
    objectKey?: string
    contentType?: string
    createdByUserId?: string
    expiresAt?: Date
  },
): Promise<StagedUploadRow> {
  const rows = await world.schoolDb
    .insert(stagedUpload)
    .values({
      chapterId: chapter_.id,
      purpose: overrides?.purpose ?? 'audio',
      status: overrides?.status ?? 'pending',
      objectKey: overrides?.objectKey ?? `schools/test/chapters/${chapter_.id}/audio/${nextUnique()}.mp3`,
      contentType: overrides?.contentType ?? 'audio/mpeg',
      createdByUserId: overrides?.createdByUserId ?? newUserId(),
      expiresAt: overrides?.expiresAt ?? new Date(Date.now() + 60 * 60 * 1000),
    })
    .returning()

  const row = rows.at(0)
  if (!row) throw new Error('createStagedUpload: insert returned no row')
  return row
}

export async function createBatch(
  world: TestWorld,
  track_: TrackRow,
  overrides?: {
    code?: string
    status?: BatchRow['status']
    startDate?: Date | null
    meetingUrl?: string | null
    enrollmentOpensAt?: Date | null
    enrollmentClosesAt?: Date | null
  },
): Promise<BatchRow> {
  const rows = await world.schoolDb
    .insert(batch)
    .values({
      trackId: track_.id,
      code: overrides?.code ?? `batch-${nextUnique()}`,
      status: overrides?.status ?? 'upcoming',
      startDate: overrides?.startDate ?? null,
      meetingUrl: overrides?.meetingUrl ?? null,
      enrollmentOpensAt: overrides?.enrollmentOpensAt ?? null,
      enrollmentClosesAt: overrides?.enrollmentClosesAt ?? null,
    })
    .returning()

  const row = rows.at(0)
  if (!row) throw new Error('createBatch: insert returned no row')
  return row
}

export async function createClassSlot(
  world: TestWorld,
  batch_: BatchRow,
  overrides?: { dayOfWeek?: number; time?: string; durationMinutes?: number },
): Promise<BatchClassSlotRow> {
  const rows = await world.schoolDb
    .insert(batchClassSlot)
    .values({
      batchId: batch_.id,
      dayOfWeek: overrides?.dayOfWeek ?? 1,
      time: overrides?.time ?? '09:00:00',
      durationMinutes: overrides?.durationMinutes ?? 60,
    })
    .returning()

  const row = rows.at(0)
  if (!row) throw new Error('createClassSlot: insert returned no row')
  return row
}

export async function enroll(
  world: TestWorld,
  profileRow: ProfileRow,
  batchRow: BatchRow,
  role: 'instructor' | 'ta' | 'student',
): Promise<EnrollmentRow> {
  const rows = await world.schoolDb
    .insert(enrollment)
    .values({
      profileId: profileRow.id,
      batchId: batchRow.id,
      role,
    })
    .returning()

  const row = rows.at(0)
  if (!row) throw new Error('enroll: insert returned no row')
  return row
}

export async function createEvaluation(
  world: TestWorld,
  o: {
    student: ProfileRow
    chapter: ChapterRow
    evaluator: ProfileRow
    level?: EvaluationRow['level']
    notes?: string | null
  },
): Promise<EvaluationRow> {
  const rows = await world.schoolDb
    .insert(evaluation)
    .values({
      studentId: o.student.id,
      chapterId: o.chapter.id,
      evaluatorId: o.evaluator.id,
      level: o.level ?? 'level1',
      notes: o.notes ?? null,
    })
    .returning()

  const row = rows.at(0)
  if (!row) throw new Error('createEvaluation: insert returned no row')
  return row
}

export async function createTrackCertification(
  world: TestWorld,
  o: {
    track: TrackRow
    student: ProfileRow
    evaluator: ProfileRow
    level?: TrackCertificationRow['level']
    notes?: string | null
  },
): Promise<TrackCertificationRow> {
  const rows = await world.schoolDb
    .insert(trackCertification)
    .values({
      trackId: o.track.id,
      studentId: o.student.id,
      evaluatorId: o.evaluator.id,
      level: o.level ?? 'level4',
      notes: o.notes ?? null,
    })
    .returning()

  const row = rows.at(0)
  if (!row) throw new Error('createTrackCertification: insert returned no row')
  return row
}

export async function createExam(
  world: TestWorld,
  o: {
    student: ProfileRow
    chapter: ChapterRow
    scheduledAt?: Date
    status?: ExamRow['status']
  },
): Promise<ExamRow> {
  const rows = await world.schoolDb
    .insert(exam)
    .values({
      studentId: o.student.id,
      chapterId: o.chapter.id,
      scheduledAt: o.scheduledAt ?? new Date(),
      status: o.status ?? 'scheduled',
    })
    .returning()

  const row = rows.at(0)
  if (!row) throw new Error('createExam: insert returned no row')
  return row
}

let registrationPhoneCounter = 0
function nextRegistrationPhone(): string {
  registrationPhoneCounter += 1
  return `+1555${String(registrationPhoneCounter).padStart(7, '0')}`
}

export async function createRegistration(
  world: TestWorld,
  overrides?: {
    status?: RegistrationRow['status']
    firstName?: string
    lastName?: string
    phone?: string
    email?: string | null
    learningGoal?: string | null
    reviewedAt?: Date | null
    reviewedBy?: string | null
  },
): Promise<RegistrationRow> {
  const rows = await world.schoolDb
    .insert(registration)
    .values({
      status: overrides?.status ?? 'pending',
      firstName: overrides?.firstName ?? 'Test',
      lastName: overrides?.lastName ?? `Student ${nextUnique()}`,
      phone: overrides?.phone ?? nextRegistrationPhone(),
      email: overrides?.email ?? null,
      learningGoal: overrides?.learningGoal ?? null,
      reviewedAt: overrides?.reviewedAt ?? null,
      reviewedBy: overrides?.reviewedBy ?? null,
    })
    .returning()

  const row = rows.at(0)
  if (!row) throw new Error('createRegistration: insert returned no row')
  return row
}

/**
 * Composed convenience builder: a track with a published and a draft chapter, a batch on that
 * track, an instructor, a TA, and two students enrolled. Reduces boilerplate for tests that only
 * need a realistic baseline scenario rather than precise control over every row.
 */
export async function seedSchoolScenario(world: TestWorld) {
  const trackRow = await createTrack(world)
  const publishedChapter = await createChapter(world, trackRow, { status: 'published' })
  const draftChapter = await createChapter(world, trackRow, { status: 'draft' })
  const batchRow = await createBatch(world, trackRow)

  const instructorProfile = await createProfile(world, { name: 'Instructor' })
  const taProfile = await createProfile(world, { name: 'TA' })
  const student1Profile = await createProfile(world, { name: 'Student One' })
  const student2Profile = await createProfile(world, { name: 'Student Two' })

  await enroll(world, instructorProfile, batchRow, 'instructor')
  await enroll(world, taProfile, batchRow, 'ta')
  await enroll(world, student1Profile, batchRow, 'student')
  await enroll(world, student2Profile, batchRow, 'student')

  return {
    track: trackRow,
    publishedChapter,
    draftChapter,
    batch: batchRow,
    instructorProfile,
    taProfile,
    student1Profile,
    student2Profile,
  }
}
