import 'server-only'

import { getBatchesForProfile, getMyBatchMemberships, type BatchMembership } from '@/lib/api/batches'
import { getExams } from '@/lib/api/exams'
import { getBatchEvaluations, getStudentEvaluations } from '@/lib/api/evaluations'
import { fetchAllPages } from '@/lib/api/pagination'
import { getTracks } from '@/lib/api/tracks'
import { getProfiles } from '@/lib/session'
import type { ApiBatch, ApiEvaluation, ApiExam, ApiTrack } from '@/lib/types'

export type TeachingBatchData = {
  evaluations: ApiEvaluation[]
}

export type DashboardData = {
  firstName: string
  memberships: BatchMembership[]
  tracks: ApiTrack[]
  studentEvaluations: ApiEvaluation[]
  upcomingExams: ApiExam[]
  teachingByBatchId: Map<string, TeachingBatchData>
  pastBatchesByStudentId: Map<string, ApiBatch[]>
}

export async function getDashboardData(profileId?: string): Promise<DashboardData> {
  const [profiles, tracks, memberships] = await Promise.all([
    getProfiles(),
    getTracks(),
    getMyBatchMemberships(),
  ])

  const studentMemberships = memberships.filter(item => item.role === 'student')
  const teachingMemberships = memberships.filter(item => item.role !== 'student')

  const teachingStudentIds = [
    ...new Set(
      teachingMemberships.flatMap(item =>
        item.batch.members.filter(member => member.role === 'student').map(member => member.profileId),
      ),
    ),
  ]

  const [studentEvaluationGroups, teachingEvaluationGroups, visibleScheduledExams, pastBatchGroups] =
    await Promise.all([
      profileId
        ? Promise.all(
            studentMemberships.map(item => getStudentEvaluations(item.batch.id, profileId)),
          )
        : [],
      Promise.all(teachingMemberships.map(item => getBatchEvaluations(item.batch.id))),
      profileId ? fetchAllPages(cursor => getExams({ status: 'scheduled', cursor })) : [],
      Promise.all(
        teachingStudentIds.map(studentId =>
          fetchAllPages(cursor => getBatchesForProfile(studentId, { cursor })),
        ),
      ),
    ])

  const byNewestEvaluation = (a: ApiEvaluation, b: ApiEvaluation) =>
    new Date(b.evaluatedAt ?? 0).getTime() - new Date(a.evaluatedAt ?? 0).getTime()

  return {
    firstName: profiles.find(profile => profile.id === profileId)?.name.split(' ')[0] ?? 'there',
    memberships,
    tracks,
    studentEvaluations: studentEvaluationGroups.flat().sort(byNewestEvaluation),
    // Teachers can see their students' exams too; the personal dashboard should not show those.
    upcomingExams: visibleScheduledExams.filter(exam => exam.studentId === profileId),
    teachingByBatchId: new Map(
      teachingMemberships.map((item, index) => [
        item.batch.id,
        { evaluations: teachingEvaluationGroups[index] ?? [] },
      ]),
    ),
    pastBatchesByStudentId: new Map(
      teachingStudentIds.map((studentId, index) => [studentId, pastBatchGroups[index] ?? []]),
    ),
  }
}
