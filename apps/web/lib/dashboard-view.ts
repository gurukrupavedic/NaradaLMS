import {
  getMasteredProgress,
  getProficiencyProgress,
  isMasteredProficiency,
  isStartedProficiency,
  type ProficiencyLevel,
} from '@/lib/proficiency'
import type { ApiChapter, ApiEvaluation, BatchStatus, EnrollmentRole } from '@/lib/types'

// Tracks are named "Track 1".."Track 8" in real data, so rendering `Track {order} — {name}`
// produced "Track 1 — Track 1" on every row. Only append the name when it says something the
// order doesn't (e.g. track 9 is named "Graduated").
export function trackLabel(order: number, name: string): string {
  const ordinal = `Track ${order}`
  return name.trim() === ordinal ? ordinal : `${ordinal} · ${name}`
}

export function pluralize(count: number, singular: string, plural = `${singular}s`): string {
  return `${count} ${count === 1 ? singular : plural}`
}

export type ChapterRow = {
  id: string
  code: string
  title: string
  level: ProficiencyLevel
  evaluatedAt: string | null
  // Each track carries a certification chapter ("TRACK 3 CERTIFICATION EXAM STATUS"). It's the
  // outcome the whole track builds toward, so it shouldn't render as just another row. Matched
  // by title, not position — track 8's sits at 8.12 of 43 chapters, not at the end.
  isCertification: boolean
}

export type LearningTrack = {
  trackId: string
  trackOrder: number
  track: string
  // The batch this student sits in for this track, when there is one. Most study history has
  // none: the roster spreadsheet records marks per student+chapter with no cohort dimension, so
  // 710 of 711 students carry exactly one enrolment while holding marks in up to eight tracks.
  // Driving this list off enrolments alone hid everything but their current batch.
  batch: { id: string; code: string; status: BatchStatus } | null
  chapters: ChapterRow[]
  started: number
  mastered: number
  total: number
  progress: number
  masteredProgress: number
}

export type TeachingBatch = {
  batchId: string
  batchCode: string
  status: BatchStatus
  track: string
  role: EnrollmentRole
  studentCount: number
  progress: number
  masteredProgress: number
  // Students in this batch with no evaluation at all — the concrete "hasn't been looked at yet"
  // signal that decides which batch a teacher should open first.
  unevaluatedCount: number
}

const CERTIFICATION_PATTERN = /certification/i

export function isCertificationChapter(chapter: { title: string }): boolean {
  return CERTIFICATION_PATTERN.test(chapter.title)
}

export function buildChapterRows(
  chapters: ApiChapter[],
  levelByChapterId: Map<string, { level: ProficiencyLevel; evaluatedAt: string | null }>,
): ChapterRow[] {
  return chapters.map(chapter => {
    const mark = levelByChapterId.get(chapter.id)
    return {
      id: chapter.id,
      code: chapter.code,
      title: chapter.title,
      level: mark?.level ?? 'notStarted',
      evaluatedAt: mark?.evaluatedAt ?? null,
      isCertification: isCertificationChapter(chapter),
    }
  })
}

export function summarizeLearningTrack(
  base: Omit<
    LearningTrack,
    'started' | 'mastered' | 'total' | 'progress' | 'masteredProgress'
  >,
): LearningTrack {
  const levels = base.chapters.map(chapter => chapter.level)
  return {
    ...base,
    started: levels.filter(isStartedProficiency).length,
    mastered: levels.filter(isMasteredProficiency).length,
    total: levels.length,
    progress: getProficiencyProgress(levels),
    masteredProgress: getMasteredProgress(levels),
  }
}

export function countUnevaluatedStudents(
  studentIds: string[],
  evaluations: ApiEvaluation[],
): number {
  const seen = new Set(evaluations.map(evaluation => evaluation.studentId))
  return studentIds.filter(id => !seen.has(id)).length
}

function isArchived(status: BatchStatus): boolean {
  return status === 'completed'
}

export function splitByStatus<T extends { status: BatchStatus }>(
  items: T[],
): { active: T[]; archived: T[] } {
  return {
    active: items.filter(item => !isArchived(item.status)),
    archived: items.filter(item => isArchived(item.status)),
  }
}

// `status: 'completed'` means the cohort's run ended, NOT that this student got through the
// material — real rosters have students sitting at 4/10 in a closed batch. Filing those under
// "completed" would bury the unfinished work, which is the most useful thing left to show, so a
// track is only archived once the student has actually been through every chapter.
export function hasUnfinishedWork(track: LearningTrack): boolean {
  return track.started < track.total
}

// A track is "live" only while a batch is still running for it. Prior study with no batch at all
// counts as ended, same as a closed one.
export function isLiveTrack(track: LearningTrack): boolean {
  return track.batch !== null && !isArchived(track.batch.status)
}

export function splitLearning<L extends LearningTrack>(
  tracks: L[],
): { active: L[]; archived: L[] } {
  return {
    active: tracks.filter(track => isLiveTrack(track) || hasUnfinishedWork(track)),
    archived: tracks.filter(track => !isLiveTrack(track) && !hasUnfinishedWork(track)),
  }
}

// Most-in-need first: batches with students nobody has evaluated yet, then the least far along.
// Code is the tiebreak so the order is stable between renders rather than depending on the
// order the API happened to return.
export function sortTeachingByAttention<T extends TeachingBatch>(batches: T[]): T[] {
  return [...batches].sort(
    (a, b) =>
      b.unevaluatedCount - a.unevaluatedCount ||
      a.progress - b.progress ||
      a.batchCode.localeCompare(b.batchCode),
  )
}

// The track with a running batch comes first — that's the one being taught right now. After
// that, furthest along, then track order so the sequence stays stable and reads in curriculum
// order.
export function sortLearningByFocus<L extends LearningTrack>(tracks: L[]): L[] {
  return [...tracks].sort(
    (a, b) =>
      Number(isLiveTrack(b)) - Number(isLiveTrack(a)) ||
      Number(b.started > 0) - Number(a.started > 0) ||
      b.progress - a.progress ||
      a.trackOrder - b.trackOrder,
  )
}

// Where the student picks back up: the earliest chapter in track order that isn't mastered yet.
// Progress isn't always sequential (real students have gaps), so "earliest still outstanding"
// matches the order they read the ladder in. Null once the whole track is mastered.
export function findResumeChapter(track: LearningTrack): ChapterRow | null {
  return track.chapters.find(chapter => !isMasteredProficiency(chapter.level)) ?? null
}

export type DashboardShape<L extends LearningTrack, T extends TeachingBatch> = {
  learning: { active: L[]; archived: L[] }
  teaching: { active: T[]; archived: T[] }
  // Which half of the page leads. Someone can be both a student and an instructor (common
  // here), so this is decided by where the live work actually is rather than by a role flag.
  lead: 'teaching' | 'learning'
}

export function buildDashboardShape<L extends LearningTrack, T extends TeachingBatch>(
  learningTracks: L[],
  teachingBatches: T[],
): DashboardShape<L, T> {
  const learning = splitLearning(learningTracks)
  // A teacher's job in a closed batch really is done, so batch status is the right axis here.
  const teaching = splitByStatus(teachingBatches)

  return {
    learning: {
      active: sortLearningByFocus(learning.active),
      archived: sortLearningByFocus(learning.archived),
    },
    teaching: {
      active: sortTeachingByAttention(teaching.active),
      archived: sortTeachingByAttention(teaching.archived),
    },
    lead: teaching.active.length > learning.active.length ? 'teaching' : 'learning',
  }
}
