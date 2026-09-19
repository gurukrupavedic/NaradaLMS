import type { SchoolDbClient } from '@narada/db'

import * as batchesRepository from '../batches/repository'
import * as enrollmentRequestsRepository from '../enrollmentRequests/repository'
import * as evaluationsRepository from '../evaluations/repository'
import * as examsRepository from '../exams/repository'
import { findAll as findAllTracks } from '../tracks/service'
import type { DashboardData, PastBatchesEntry, TeachingSummary } from './schema'

type DashboardServiceContext = { db: SchoolDbClient }

/**
 * The one place all of a profile's dashboard data is assembled, in a small, fixed number of
 * queries — regardless of how many batches they're in or how many students they teach. Every
 * piece here used to be its own HTTP round-trip from the Next.js server, looped once per batch or
 * once per taught student — the exact fan-out shape that already exhausted the DB connection pool
 * once (see [[project_batch_n1_incident]]). Ported from apps/api/src/services/dashboard.ts's
 * logic, adapted to this codebase's domain split (repository functions from each domain, not one
 * flat set of queries).
 */
export async function getDashboardData(
  context: DashboardServiceContext,
  profileId: string,
  profileName: string,
): Promise<DashboardData> {
  const [memberships, tracks, pendingBatchIds] = await Promise.all([
    batchesRepository.findAllMembershipsWithDetail(context.db, profileId),
    findAllTracks(context, { kind: 'learnerPreview' }),
    enrollmentRequestsRepository.findPendingBatchIdsForProfile(context.db, profileId),
  ])

  const trackById = new Map(tracks.map(track => [track.id, track]))
  const chapterIdsForTrack = (trackId: string): string[] =>
    trackById.get(trackId)?.chapters.map(chapter => chapter.id) ?? []

  // Excludes every other role — this is "batches I personally teach," not "every batch I can
  // administer." A school-wide admin's broader access is a separate question (AccessPolicy's
  // getBatchVisibility), deliberately not consulted here: the dashboard shows a profile's own
  // activity, not an admin browsing view.
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

  const [studentEvaluations, examResults, upcomingExams, teachingEvaluationsFlat, pastBatchesByStudentId] =
    await Promise.all([
      evaluationsRepository.findAllForStudent(context.db, profileId),
      examsRepository.findResultsForStudent(context.db, profileId),
      examsRepository.findUpcomingForStudent(context.db, profileId),
      evaluationsRepository.findForChaptersAndStudents(
        context.db,
        teachingChapterIds,
        teachingStudentIds,
      ),
      batchesRepository.findAllForProfiles(context.db, teachingStudentIds),
    ])

  // One query fetched every taught-batch-relevant evaluation at once; bucket it back per batch
  // here (in memory, no extra queries) — two taught batches can share a track, so chapterId alone
  // can't tell them apart, only the actual roster (already known) can.
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
    examResults,
    upcomingExams,
    teaching,
    pastBatchesByStudent,
    pendingBatchIds,
  }
}
