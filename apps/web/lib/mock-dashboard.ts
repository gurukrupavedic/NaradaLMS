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
  students: RosterStudent[]
  unevaluatedCount: number
  progress: number
  masteredProgress: number
}

export type CertificationRow = {
  track: string
  chapter: string
  level: ProficiencyLevel
  awardedAt: string | null
}

export type SittingRow = {
  id: string
  chapterCode: string
  chapterTitle: string
  track: string
  when: string
  level: ProficiencyLevel | null
  notes: string | null
}

export type AdminBatchRow = {
  code: string
  track: string
  status: 'upcoming' | 'active' | 'completed'
  students: number
  staff: string
  hasSchedule: boolean
  hasMeetingUrl: boolean
  isOpenForEnrollment: boolean
}

export type ClassSlot = { day: string; time: string; durationMinutes: number }

export type BatchStaff = { name: string; role: 'instructor' | 'ta' }

export type AdminBatchDetail = AdminBatchRow & {
  id: string
  trackId: string
  startDate: string | null
  meetingUrl: string | null
  classSlots: ClassSlot[]
  staffRoster: BatchStaff[]
  chapterCodes: string[]
  roster: RosterStudent[]
  enrollmentOpensAt: string | null
  enrollmentClosesAt: string | null
  capacity: number | null
}

export function summariseRoster(roster: RosterStudent[]) {
  const all = roster.flatMap(student => student.marks)
  return {
    progress: getProficiencyProgress(all),
    masteredProgress: getMasteredProgress(all),
    unmarked: roster.filter(student => student.current === null).length,
  }
}
