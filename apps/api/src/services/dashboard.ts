import type { SchoolDbExecutor } from '@narada/db'

import {
  findBatchesForProfiles,
  findBatchesWithDetail,
  listBatchesQuerySchema,
  type Batch,
  type BatchWithRole,
} from './batch'
import { findTracks, type TrackWithChapters } from './track'
import type { Evaluation } from './evaluation'
import { type ExamWithDetail } from './exam'

export type TeachingSummary = { batchId: string; evaluations: Evaluation[] }
export type PastBatchesEntry = { studentId: string; batches: Batch[] }

export type DashboardData = {
  firstName: string
  memberships: BatchWithRole[]
  tracks: TrackWithChapters[]
  studentEvaluations: Evaluation[]
  upcomingExams: ExamWithDetail[]
  teaching: TeachingSummary[]
  pastBatchesByStudent: PastBatchesEntry[]
}

const MEMBERSHIPS_PAGE_SIZE = 100

// findBatchesWithDetail's own cursor field is base64 that a route would normally decode via
// parseQuery — reusing the exact schema here rather than re-implementing the encoding.
type MembershipsCursor = NonNullable<
  import('zod').infer<typeof listBatchesQuerySchema>['cursor']
>

async function findAllMyMemberships(
  db: SchoolDbExecutor,
  profileId: string,
): Promise<BatchWithRole[]> {
  const items: BatchWithRole[] = []
  let cursor: MembershipsCursor | undefined

  do {
    const page = await findBatchesWithDetail(db, {
      access: { kind: 'enrolled', profileId },
      roleForProfileId: profileId,
      limit: MEMBERSHIPS_PAGE_SIZE,
      cursor,
    })
    items.push(...page.items)
    cursor = page.nextCursor
      ? listBatchesQuerySchema.shape.cursor.parse(page.nextCursor)
      : undefined
  } while (cursor)

  return items
}

// The one place all of a profile's dashboard data is assembled, in a small, fixed number of
// queries — regardless of how many batches they're in or how many students they teach. Every
// piece here used to be its own HTTP round-trip from the Next.js server (getDashboardData in
// apps/web/lib/dashboard.ts), looped once per batch or once per taught student. That's the exact
// fan-out shape that already exhausted the DB connection pool once (see the batch-list N+1 fix
// above) — a teacher with a large roster turned "load my dashboard" into dozens of concurrent
// Express requests, each independently checking out a pool connection.
export async function getDashboardData(
  db: SchoolDbExecutor,
  profileId: string,
  profileName: string,
): Promise<DashboardData> {
  const [memberships, tracks] = await Promise.all([
    findAllMyMemberships(db, profileId),
    findTracks(db, { kind: 'learnerPreview' }),
  ])

  const trackById = new Map(tracks.map(track => [track.id, track]))
  const chapterIdsForTrack = (trackId: string): string[] =>
    trackById.get(trackId)?.chapters.map(chapter => chapter.id) ?? []

  // Excludes role === null (a school-wide admin/owner's view of a batch they don't personally
  // teach) — an admin's "every batch in the school" access shouldn't turn into a per-batch fetch
  // here any more than it should have via the old HTTP fan-out.
  const teachingMemberships = memberships.filter(m => m.role === 'instructor' || m.role === 'ta')

  const teachingChapterIds = [
    ...new Set(teachingMemberships.flatMap(m => chapterIdsForTrack(m.trackId))),
  ]
  const teachingStudentIds = [
    ...new Set(
      teachingMemberships.flatMap(m =>
        m.members.filter(member => member.role === 'student').map(member => member.profileId),
      ),
    ),
  ]

  const [studentEvaluations, upcomingExams, teachingEvaluationsFlat, pastBatchesByStudentId] =
    await Promise.all([
      // The caller's own marks, across every track rather than only currently-enrolled ones.
      // Achievements outlive enrolment: a student who certified in tracks 1-8 over several years
      // is enrolled in at most one of those batches today, and scoping to current enrolments
      // reported them as certified in one track instead of eight. This is the caller's own row
      // set and stays small (~140 rows for the heaviest student in the real roster).
      db.query.evaluation.findMany({
        where: (t, { eq }) => eq(t.studentId, profileId),
        orderBy: (t, { desc }) => desc(t.evaluatedAt),
      }),
      db.query.exam.findMany({
        where: (t, { and, eq }) => and(eq(t.studentId, profileId), eq(t.status, 'scheduled')),
        orderBy: (t, { asc }) => asc(t.scheduledAt),
        with: {
          chapter: { columns: { id: true, code: true, title: true, trackId: true } },
          evaluation: { columns: { level: true, notes: true } },
        },
      }),
      teachingChapterIds.length > 0 && teachingStudentIds.length > 0
        ? db.query.evaluation.findMany({
            where: (t, { and, inArray }) =>
              and(
                inArray(t.chapterId, teachingChapterIds),
                inArray(t.studentId, teachingStudentIds),
              ),
          })
        : [],
      findBatchesForProfiles(db, teachingStudentIds),
    ])

  // A single query fetched every taught-batch-relevant evaluation at once; bucket it back per
  // batch here (in memory, no extra queries) rather than in SQL, since two taught batches can
  // share the same track — chapterId alone can't tell them apart, only the actual roster can.
  const teaching: TeachingSummary[] = teachingMemberships.map(membership => {
    const chapterIds = new Set(chapterIdsForTrack(membership.trackId))
    const studentIds = new Set(
      membership.members.filter(member => member.role === 'student').map(member => member.profileId),
    )
    return {
      batchId: membership.id,
      evaluations: teachingEvaluationsFlat.filter(
        evaluation => chapterIds.has(evaluation.chapterId) && studentIds.has(evaluation.studentId),
      ),
    }
  })

  const pastBatchesByStudent: PastBatchesEntry[] = teachingStudentIds.map(studentId => ({
    studentId,
    batches: pastBatchesByStudentId.get(studentId) ?? [],
  }))

  return {
    firstName: profileName.split(' ')[0] || 'there',
    memberships,
    tracks,
    studentEvaluations,
    upcomingExams,
    teaching,
    pastBatchesByStudent,
  }
}
