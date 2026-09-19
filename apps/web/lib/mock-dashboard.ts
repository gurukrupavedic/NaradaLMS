import type { ApiExamOutcome, ApiExamResult } from '@/lib/api/api-types'
import { getMasteredProgress, getProficiencyProgress, type ProficiencyLevel } from '@/lib/proficiency'

/**
 * Types this workspace's real fetchers (`lib/api/resources.ts`) still build, for shapes that have
 * no fixture data behind them anymore — the same move `lib/mock-catalog.ts` and
 * `lib/mock-content.ts` made, for the same reason: their own header comments have the fuller
 * account. `summariseRoster` is the one real function left here, not just a type:
 * `components/admin/batch-detail.tsx` calls it directly on a roster it gets from
 * `lib/api/reshape.ts`'s `buildRoster` — a different, real-data function despite the similar name.
 */

export type RosterStudent = {
  id: string
  name: string
  city: string | null
  marks: ProficiencyLevel[]
  current: string | null
}

export type TeachingBatch = {
  batchId: string
  batchCode: string
  track: string
  role: 'instructor' | 'ta'
  status: 'active' | 'completed'
  chapterCodes: string[]
  // Parallel to chapterCodes — see AdminBatchDetail.chapterIds' own doc comment.
  chapterIds: string[]
  chapterTitles: string[]
  students: RosterStudent[]
  unevaluatedCount: number
  progress: number
  masteredProgress: number
}

// A track's standing, read off its latest graded exam. `level` is `notStarted` both for a track
// never sat and for a `reappear` (which grants no level) — `outcome` is what tells the two apart:
// null means never sat.
export type CertificationRow = {
  track: string
  level: ProficiencyLevel
  outcome: ApiExamOutcome | null
  total: number | null
  awardedAt: string | null
}

// One track exam sitting. `result` is null while it's still booked.
export type SittingRow = {
  id: string
  track: string
  when: string
  result: ApiExamResult | null
}

export type AdminBatchRow = {
  id: string
  code: string
  track: string
  status: 'upcoming' | 'active' | 'completed'
  students: number
  staff: string
  hasSchedule: boolean
  hasMeetingUrl: boolean
}

export type ClassSlot = { day: string; time: string; durationMinutes: number }

export type BatchStaff = { name: string; role: 'instructor' | 'ta' }

export type AdminBatchDetail = AdminBatchRow & {
  trackId: string
  startDate: string | null
  meetingUrl: string | null
  classSlots: ClassSlot[]
  staffRoster: BatchStaff[]
  chapterCodes: string[]
  // Parallel to chapterCodes (same order, same index) — `RosterStudent.marks[i]` is one chapter's
  // mark for that student, keyed to this same order. Carried separately from chapterCodes (rather
  // than folded into RosterStudent) because the mark-book's grade editor needs the real chapter
  // id to POST an evaluation; the code alone (what the grid displays) isn't enough for that.
  chapterIds: string[]
  // Parallel to chapterCodes/chapterIds — the grade dialog's own title line
  // (components/grade-dialog.tsx) shows the full title, not just the code.
  chapterTitles: string[]
  roster: RosterStudent[]
}

export function summariseRoster(roster: RosterStudent[]) {
  const all = roster.flatMap(student => student.marks)
  return {
    progress: getProficiencyProgress(all),
    masteredProgress: getMasteredProgress(all),
    unmarked: roster.filter(student => student.current === null).length,
  }
}
