import { describe, expect, it } from 'vitest'

import type { ApiBatchWithRole, ApiDashboard, ApiEvaluation, ApiTrack } from '@/lib/api/api-types'
import { buildLearningTracks } from './reshape'

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
): ApiBatchWithRole => ({
  id: `batch-${trackId}-${role}-${status}`,
  trackId,
  code: `CODE-${trackId}-${role}`,
  status,
  startDate: null,
  meetingUrl: null,
  members: [],
  classSlots: [],
  role,
  enrollmentStatus: 'active',
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
    expect(ladder.batchCode).toBe('CODE-track-1-student')
  })
})
