import {
  getProficiencyProgress,
  isStartedProficiency,
  type ProficiencyLevel,
} from '@/lib/proficiency'
import type { ApiBatch, ApiBatchMember, ApiChapter, ApiEvaluation, ApiTrack } from '@/lib/types'

// A roster member without instructor/ta-only fields, for display in student-facing rows.
export type RosterStudent = {
  id: string
  name: string
  phone: string | null
  city: string | null
  joinedAt: string | null
}

export type RosterRow = {
  student: RosterStudent
  current: { chapter: ApiChapter; level: ProficiencyLevel } | null
  chapterMarks: Array<{
    chapter: ApiChapter
    level: ProficiencyLevel
    latest: ApiEvaluation | undefined
  }>
}

export function toRosterStudent(member: ApiBatchMember): RosterStudent {
  return {
    id: member.profileId,
    name: member.name,
    phone: member.phone,
    city: member.city,
    joinedAt: member.joinedAt,
  }
}

// Evaluations are expected sorted DESC by evaluatedAt (matches the API's list order) — first
// match per (studentId, chapterId) is the latest.
export function getLatestEvaluation(
  evaluations: ApiEvaluation[],
  studentId: string,
  chapterId: string,
): ApiEvaluation | undefined {
  return evaluations.find(e => e.studentId === studentId && e.chapterId === chapterId)
}

export function getChapterLevel(
  evaluations: ApiEvaluation[],
  studentId: string,
  chapterId: string,
): ProficiencyLevel {
  return getLatestEvaluation(evaluations, studentId, chapterId)?.level ?? 'notStarted'
}

export function getStudentEvaluationHistory(
  evaluations: ApiEvaluation[],
  studentId: string,
): ApiEvaluation[] {
  return evaluations.filter(e => e.studentId === studentId)
}

// null when the batch's track has no chapters yet — there's nothing to be "current" on.
export function getCurrentChapter(
  evaluations: ApiEvaluation[],
  chapters: ApiChapter[],
  studentId: string,
): { chapter: ApiChapter; level: ProficiencyLevel } | null {
  for (const chapter of chapters) {
    const level = getChapterLevel(evaluations, studentId, chapter.id)
    if (level === 'notStarted' || level === 'absent' || level === 'practicing') {
      return { chapter, level }
    }
  }

  const lastChapter = chapters.at(-1)
  if (!lastChapter) return null
  return { chapter: lastChapter, level: getChapterLevel(evaluations, studentId, lastChapter.id) }
}

export function getStudentProgress(
  evaluations: ApiEvaluation[],
  chapters: ApiChapter[],
  studentId: string,
) {
  const levels = chapters.map(chapter => getChapterLevel(evaluations, studentId, chapter.id))
  const startedCount = levels.filter(isStartedProficiency).length
  return { levels, startedCount, progress: getProficiencyProgress(levels) }
}

export function getBatchProgress(
  evaluations: ApiEvaluation[],
  chapters: ApiChapter[],
  students: RosterStudent[],
): number {
  if (students.length === 0) return 0
  const total = students.reduce(
    (sum, student) => sum + getStudentProgress(evaluations, chapters, student.id).progress,
    0,
  )
  return Math.round(total / students.length)
}

// Evaluator names aren't in ApiEvaluation (just evaluatorId) — batch members double as the
// lookup, since an evaluation's evaluator is always an instructor/ta on that same batch.
export function getEvaluatorName(members: ApiBatchMember[], evaluatorId: string): string {
  return members.find(member => member.profileId === evaluatorId)?.name ?? 'Unknown'
}

export type PastBatch = { batch: ApiBatch; trackName: string }

// Batches already sorted most-recent-first by the API; drop the one currently being viewed and
// resolve each batch's track name for display.
export function getPastBatches(
  batches: ApiBatch[],
  trackMap: Map<string, ApiTrack>,
  currentBatchId: string,
): PastBatch[] {
  return batches
    .filter(batch => batch.id !== currentBatchId)
    .map(batch => ({ batch, trackName: trackMap.get(batch.trackId)?.name ?? 'Unknown track' }))
}
