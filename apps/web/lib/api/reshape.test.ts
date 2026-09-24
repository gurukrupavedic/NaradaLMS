import { describe, expect, it } from 'vitest'

import type { ApiBatchWithRole, ApiDashboard, ApiEvaluation, ApiTrack } from '@/lib/api/api-types'
import { buildLearningTracks, buildRoster, isArchivedTrack, isRosterStudent } from './reshape'

const chapter = (id: string, trackId: string, order: number) => ({
  id,
  trackId,
  code: id,
  title: id,
  status: 'published' as const,
  order,
  script: null,
})

const track = (id: string, order: number, chapterCount: number): ApiTrack => ({
  id,
  name: `Track ${order}`,
  order,
  chapters: Array.from({ length: chapterCount }, (_, i) => chapter(`${id}-c${i}`, id, i)),
})

const evaluation = (chapterId: string): ApiEvaluation => ({
  id: `eval-${chapterId}`,
  studentId: 'siva',
  chapterId,
  level: 'level4',
  notes: null,
  evaluatorId: 'someone',
  evaluatedAt: '2020-01-01',
})

const membership = (
  trackId: string,
  role: ApiBatchWithRole['role'],
  status: ApiBatchWithRole['status'],
  enrollmentStatus: ApiBatchWithRole['enrollmentStatus'] = 'active',
): ApiBatchWithRole => ({
  id: `batch-${trackId}-${role}-${status}-${enrollmentStatus}`,
  trackId,
  code: `CODE-${trackId}-${role}-${enrollmentStatus}`,
  status,
  startDate: null,
  meetingUrl: null,
  members: [],
  classSlots: [],
  role,
  enrollmentStatus,
})

const baseDashboard = (overrides: Partial<ApiDashboard>): ApiDashboard => ({
  firstName: 'Siva',
  memberships: [],
  tracks: [],
  studentEvaluations: [],
  examResults: [],
  upcomingExams: [],
  teaching: [],
  pastBatchesByStudent: [],
  pendingBatchIds: [],
  ...overrides,
})

describe('buildLearningTracks', () => {
  it('archives a fully-mastered track even when the profile currently teaches a live batch for it', () => {
    // Mirrors a real case: a long-serving guru/TA re-enrolled as `ta` in that track's batch every
    // year (most recently this year's, still `active`), while their own mastery of the track (as
    // a `student`, long ago) has no enrollment at all left on record.
    const t1 = track('track-1', 1, 2)
    const dashboard = baseDashboard({
      tracks: [t1],
      studentEvaluations: t1.chapters.map(c => evaluation(c.id)),
      memberships: [membership('track-1', 'ta', 'active')],
    })

    const [ladder] = buildLearningTracks(dashboard)

    expect(ladder.mastered).toBe(2)
    expect(ladder.total).toBe(2)
    expect(ladder.batchStatus).toBeNull()
    expect(ladder.batchCode).toBeNull()
  })

  it('still reflects the profile’s own batch when they hold a student membership', () => {
    const t1 = track('track-1', 1, 2)
    const dashboard = baseDashboard({
      tracks: [t1],
      studentEvaluations: [evaluation(t1.chapters[0].id)],
      memberships: [
        membership('track-1', 'ta', 'active'),
        membership('track-1', 'student', 'active'),
      ],
    })

    const [ladder] = buildLearningTracks(dashboard)

    expect(ladder.batchStatus).toBe('active')
    expect(ladder.batchCode).toBe('CODE-track-1-student-active')
  })
})

describe('a student seat that is not live', () => {
  const mastered = () => {
    const t1 = track('track-1', 1, 2)
    return { t1, evaluations: t1.chapters.map(c => evaluation(c.id)) }
  }

  it.each(['break', 'dropped', 'inactive'] as const)(
    'archives a fully-worked track whose seat in a running batch is %s, but still names the batch',
    enrollmentStatus => {
      const { t1, evaluations } = mastered()
      const [ladder] = buildLearningTracks(
        baseDashboard({
          tracks: [t1],
          studentEvaluations: evaluations,
          memberships: [membership('track-1', 'student', 'active', enrollmentStatus)],
        }),
      )

      expect(ladder.batchCode).toBe(`CODE-track-1-student-${enrollmentStatus}`)
      expect(isArchivedTrack(ladder)).toBe(true)
    },
  )

  it('keeps a fully-worked track in progress while the seat is live in a running batch', () => {
    const { t1, evaluations } = mastered()
    const [ladder] = buildLearningTracks(
      baseDashboard({
        tracks: [t1],
        studentEvaluations: evaluations,
        memberships: [membership('track-1', 'student', 'active', 'active')],
      }),
    )

    expect(isArchivedTrack(ladder)).toBe(false)
  })

  it('archives a fully-worked track once its batch has completed, even with a live seat', () => {
    const { t1, evaluations } = mastered()
    const [ladder] = buildLearningTracks(
      baseDashboard({
        tracks: [t1],
        studentEvaluations: evaluations,
        memberships: [membership('track-1', 'student', 'completed', 'active')],
      }),
    )

    expect(isArchivedTrack(ladder)).toBe(true)
  })

  it('never archives a track that is not fully worked', () => {
    const t1 = track('track-1', 1, 2)
    const [ladder] = buildLearningTracks(
      baseDashboard({
        tracks: [t1],
        studentEvaluations: [evaluation(t1.chapters[0].id)],
        memberships: [membership('track-1', 'student', 'active', 'break')],
      }),
    )

    expect(isArchivedTrack(ladder)).toBe(false)
  })

  it('prefers a live seat over a past one for the same track, whatever order they arrive in', () => {
    const t1 = track('track-1', 1, 2)
    const past = membership('track-1', 'student', 'completed', 'inactive')
    const live = membership('track-1', 'student', 'active', 'active')

    for (const memberships of [[past, live], [live, past]]) {
      const [ladder] = buildLearningTracks(baseDashboard({ tracks: [t1], memberships }))
      expect(ladder.batchCode).toBe('CODE-track-1-student-active')
    }
  })
})

describe('buildRoster', () => {
  const member = (
    profileId: string,
    role: ApiBatchWithRole['members'][number]['role'],
    status: ApiBatchWithRole['members'][number]['status'],
  ) => ({
    profileId,
    name: profileId,
    phone: null,
    email: null,
    city: null,
    role,
    joinedAt: null,
    status,
  })

  const batchWith = (batchStatus: ApiBatchWithRole['status']): ApiBatchWithRole => ({
    ...membership('track-1', 'instructor', batchStatus),
    members: [
      member('active-student', 'student', 'active'),
      member('break-student', 'student', 'break'),
      member('inactive-student', 'student', 'inactive'),
      member('dropped-student', 'student', 'dropped'),
      member('active-ta', 'ta', 'active'),
      member('break-ta', 'ta', 'break'),
      member('teacher', 'instructor', 'active'),
    ],
  })

  const idsFor = (batchStatus: ApiBatchWithRole['status']) =>
    buildRoster(batchWith(batchStatus), [], []).map(s => s.id)

  it('hides a student on break while the batch is still running', () => {
    expect(idsFor('active')).toEqual(['active-student', 'active-ta'])
    expect(idsFor('upcoming')).toEqual(['active-student', 'active-ta'])
  })

  it('shows students on break once the batch is completed, but no other non-active seat', () => {
    expect(idsFor('completed')).toEqual(['active-student', 'break-student', 'active-ta', 'break-ta'])
  })

  it('shows a class TA on the roster like a student, and never the teacher', () => {
    expect(idsFor('active')).toContain('active-ta')
    expect(idsFor('active')).not.toContain('teacher')
    expect(idsFor('completed')).not.toContain('teacher')
  })

  it('isRosterStudent agrees with the roster for every batch status, so a batch count matches its rows', () => {
    for (const batchStatus of ['upcoming', 'active', 'completed'] as const) {
      const batch = batchWith(batchStatus)
      expect(batch.members.filter(m => isRosterStudent(m, batchStatus)).map(m => m.profileId)).toEqual(
        idsFor(batchStatus),
      )
    }
  })
})
