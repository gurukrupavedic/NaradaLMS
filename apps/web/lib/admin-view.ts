import { pluralize, trackLabel } from '@/lib/dashboard-view'
import type { ApiBatchDetail, ApiTrack, BatchStatus } from '@/lib/types'

export type AdminBatchRow = {
  id: string
  code: string
  status: BatchStatus
  trackOrder: number
  track: string
  startDate: string | null
  studentCount: number
  teachers: string[]
  hasMeetingUrl: boolean
  hasSchedule: boolean
}

export type SchoolSummary = {
  total: number
  active: number
  students: number
  tracks: number
  // Every active batch in the real school is missing both of these, so flagging them per row
  // would mark all 43 rows. Counted once here instead.
  activeMissingJoinLink: number
  activeMissingSchedule: number
}

// Batch codes end in a group number, so plain string ordering puts GR-11 and GR-13 ahead of
// GR-2. Compare numeric runs as numbers so the list reads 1, 2, 3 … 11, 13.
export function compareCodes(a: string, b: string): number {
  return a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' })
}

export function buildAdminRows(
  batches: ApiBatchDetail[],
  tracks: ApiTrack[],
): AdminBatchRow[] {
  const trackById = new Map(tracks.map(track => [track.id, track]))

  return batches
    .map(batch => {
      const track = trackById.get(batch.trackId)
      return {
        id: batch.id,
        code: batch.code,
        status: batch.status,
        trackOrder: track?.order ?? Number.MAX_SAFE_INTEGER,
        track: track ? trackLabel(track.order, track.name) : 'Unknown track',
        startDate: batch.startDate,
        studentCount: batch.members.filter(member => member.role === 'student').length,
        teachers: batch.members
          .filter(member => member.role === 'instructor' || member.role === 'ta')
          .map(member => member.name),
        hasMeetingUrl: batch.meetingUrl !== null,
        hasSchedule: batch.classSlots.length > 0,
      }
    })
    .sort((a, b) => a.trackOrder - b.trackOrder || compareCodes(a.code, b.code))
}

export function summarizeSchool(rows: AdminBatchRow[]): SchoolSummary {
  const active = rows.filter(row => row.status === 'active')
  return {
    total: rows.length,
    active: active.length,
    students: rows.reduce((sum, row) => sum + row.studentCount, 0),
    tracks: new Set(rows.map(row => row.trackOrder)).size,
    activeMissingJoinLink: active.filter(row => !row.hasMeetingUrl).length,
    activeMissingSchedule: active.filter(row => !row.hasSchedule).length,
  }
}

// One line describing school-wide setup gaps, or null when there's nothing to say. Written to
// read the same whether it's all of them or a handful.
export function describeSetupGaps(summary: SchoolSummary): string | null {
  const parts: string[] = []
  if (summary.activeMissingJoinLink > 0) {
    parts.push(
      summary.activeMissingJoinLink === summary.active
        ? 'none have a join link'
        : `${summary.activeMissingJoinLink} have no join link`,
    )
  }
  if (summary.activeMissingSchedule > 0) {
    parts.push(
      summary.activeMissingSchedule === summary.active
        ? 'none have a schedule'
        : `${summary.activeMissingSchedule} have no schedule`,
    )
  }
  if (parts.length === 0) return null

  return `Of ${pluralize(summary.active, 'active batch', 'active batches')}, ${parts.join(' and ')}.`
}

export function filterAdminRows(rows: AdminBatchRow[], query: string): AdminBatchRow[] {
  const needle = query.trim().toLowerCase()
  if (!needle) return rows

  return rows.filter(
    row =>
      row.code.toLowerCase().includes(needle) ||
      row.track.toLowerCase().includes(needle) ||
      row.teachers.some(name => name.toLowerCase().includes(needle)),
  )
}
