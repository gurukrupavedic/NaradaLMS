import {
  getMasteredProgress,
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

// Newest first: evaluatedAt DESC with nulls last, then id DESC (ids are UUIDv7, so they order by
// creation time and break ties between marks stamped in the same bulk import). This is the same
// order the API's evaluation lists use; sorting again here is cheap and means a caller can never
// end up with "first match = oldest mark", which is what made the dashboard disagree with history.
export function sortEvaluationsLatestFirst(evaluations: ApiEvaluation[]): ApiEvaluation[] {
  return [...evaluations].sort((a, b) => {
    if (a.evaluatedAt !== b.evaluatedAt) {
      if (a.evaluatedAt === null) return 1
      if (b.evaluatedAt === null) return -1
      const diff = new Date(b.evaluatedAt).getTime() - new Date(a.evaluatedAt).getTime()
      if (diff !== 0) return diff
    }
    return b.id.localeCompare(a.id)
  })
}

// Evaluations are expected sorted DESC by evaluatedAt (see sortEvaluationsLatestFirst) — first
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
  return {
    levels,
    startedCount,
    progress: getProficiencyProgress(levels),
    masteredProgress: getMasteredProgress(levels),
  }
}

export type BatchProgress = { progress: number; masteredProgress: number }

// Two separate numbers, not one: "progress" answers "how much has been touched," "masteredProgress"
// answers "how much has actually been mastered" — a batch where everyone just started every
// chapter should not read the same as one where everyone has finished it.
export function getBatchProgress(
  evaluations: ApiEvaluation[],
  chapters: ApiChapter[],
  students: RosterStudent[],
): BatchProgress {
  if (students.length === 0) return { progress: 0, masteredProgress: 0 }
  const perStudent = students.map(student => getStudentProgress(evaluations, chapters, student.id))
  const progress = perStudent.reduce((sum, s) => sum + s.progress, 0) / students.length
  const masteredProgress = perStudent.reduce((sum, s) => sum + s.masteredProgress, 0) / students.length
  return { progress: Math.round(progress), masteredProgress: Math.round(masteredProgress) }
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
