import type { BatchRow, EnrollmentRow, EvaluationRow, ProfileRow, TrackRow } from '../seed-types'
import { clean, columns, rowNumber, stableId, type Ctx, type Sheet } from './sheet'

const GURU_COLUMNS = ['GURUVU GARU 1', 'GURUVU GARU 2', 'GURUVU GARU 3', 'GURUVU GARU 4']
const ROLE_RANK = { instructor: 3, ta: 2, student: 1 } as const

// The sheet's own scale: 1-4 are levels 1-4, -1 is L0 (taught, not yet graded) and -2 is absent. Zero
// is "no result", the same as a blank cell, so it makes no evaluation. Anything else in a grade cell is
// a mistake in the spreadsheet.
const GRADE_LEVELS: Record<number, EvaluationRow['level']> = {
  [-2]: 'absent',
  [-1]: 'level0',
  1: 'level1',
  2: 'level2',
  3: 'level3',
  4: 'level4',
}
const NO_RESULT_GRADE = 0

/**
 * Reads the tracker sheet: one row per student in their current batch, naming the batch's gurus and
 * grading each chapter. Produces the batches, everyone's enrollments and the chapter evaluations.
 */
export function parseTracker(
  ctx: Ctx,
  tracker: Sheet,
  input: {
    batchPrefix: string
    profiles: Map<string, ProfileRow>
    tracks: TrackRow[]
    chapterColumns: { index: number; chapterId: string }[]
  },
) {
  const { course, school, report, block } = ctx
  const { profiles, tracks, chapterColumns } = input
  const col = columns(tracker)
  const lastTrack = tracks.length

  // <prefix>-<year>-<age group>-<track>-<index>; a remedial batch has REM for its track, a teachers'
  // batch is <prefix>-<year>-TEACH-<index>. Both are put on the final track: their students have
  // finished the whole curriculum, so no earlier track fits.
  const codePattern = new RegExp(`^${input.batchPrefix}-(\\d{4})-(?:[A-Z]{2}-)?(\\d+|REM)-\\d+$`, 'i')
  const teachPattern = new RegExp(`^${input.batchPrefix}-(\\d{4})-TEACH-\\d+$`, 'i')

  const batches = new Map<string, BatchRow & { year: number; track: number }>()
  const enrollments = new Map<string, EnrollmentRow>()
  const evaluations: EvaluationRow[] = []
  const seats = new Map<string, { batchId: string; evaluatorId: string }>() // by student PRIMARY KEY
  const seenKeys = new Map<string, number>() // PRIMARY KEY -> the row it first appeared on
  const gurusByBatch = new Map<string, Map<string, Set<string>>>() // batch -> column -> keys named

  function parseBatchCode(code: string) {
    const teach = code.match(teachPattern)
    const match = teach ?? code.match(codePattern)
    if (!match) return undefined
    const token = teach ? 'TEACH' : match[2].toUpperCase()
    const track = /^\d+$/.test(token) ? Number(token) : lastTrack
    if (track < 1 || track > lastTrack) return undefined
    if (!/^\d+$/.test(token)) {
      report.batchCodeAssumptions.push({ batchCode: code, reason: `no track number in the code (${token}) — mapped to the final track (${lastTrack})` })
    }
    return { year: Number(match[1]), track }
  }

  // One enrollment per (profile, batch), so someone listed as guru and student of one batch — a
  // teachers' batch, or a batch whose TAs are its own students — holds a single role. Teaching
  // outranks studying: the role decides what they may do in the batch, and their own grades are stored
  // against the profile, not the enrollment. Every case is in the report.
  function enroll(key: string, batchCode: string, enrollment: EnrollmentRow) {
    const id = `${enrollment.profileId}|${enrollment.batchId}`
    const existing = enrollments.get(id)
    if (!existing) return void enrollments.set(id, enrollment)
    if (existing.role === enrollment.role) return
    const winner = ROLE_RANK[enrollment.role] > ROLE_RANK[existing.role] ? enrollment : existing
    const loser = winner === enrollment ? existing : enrollment
    report.enrollmentRoleOverrides.push({ profileKey: key, batchCode, kept: winner.role, dropped: loser.role })
    if (winner === enrollment) enrollments.set(id, { ...existing, role: enrollment.role, status: 'active' })
  }

  tracker.rows.forEach((row, i) => {
    const key = clean(row[col.index('PRIMARY KEY')])
    const batchCode = clean(row[col.index('BATCH NUMBER (NARADA LMS)')])
    if (!key && !batchCode) return
    const where = { sheet: tracker.name, row: rowNumber(tracker, i), key }

    if (seenKeys.has(key)) return block(where, `PRIMARY KEY repeats row ${seenKeys.get(key)} — one student, two rows`)
    seenKeys.set(key, where.row)
    const profile = profiles.get(key)
    if (!profile) return block(where, 'PRIMARY KEY is in no row of the registration sheet')

    let batch = batches.get(batchCode)
    if (!batch) {
      const parsed = parseBatchCode(batchCode)
      if (!parsed) {
        return block(where, `BATCH NUMBER "${batchCode}" does not look like ${input.batchPrefix}-<year>-…-<track>-<index> (track 1-${lastTrack}, or REM) or ${input.batchPrefix}-<year>-TEACH-<index>`)
      }
      batch = { id: stableId('batch', school, batchCode), trackId: tracks[parsed.track - 1].id, code: batchCode, status: 'upcoming', startDate: null, meetingUrl: null, ...parsed }
      batches.set(batchCode, batch)
    }

    const statusText = clean(row[col.index('STUDENT STATUS')]).toLowerCase()
    const status = statusText.includes('break') ? 'break' : statusText.includes('activ') ? 'active' : undefined
    if (!status) return block(where, `STUDENT STATUS "${clean(row[col.index('STUDENT STATUS')])}" is not Active or Break`)
    // A track-1 batch is where students start, so its year is when they joined.
    const joinedAt = batch.track === 1 ? `${batch.year}-01-01` : null

    enroll(key, batchCode, { profileId: profile.id, batchId: batch.id, role: 'student', status, joinedAt })

    // The gurus are PRIMARY KEYs, so the same people as in the registration sheet.
    const gurus: ProfileRow[] = []
    GURU_COLUMNS.forEach((column, g) => {
      const guruKey = clean(row[col.index(column)])
      if (!guruKey) return
      const byColumn = gurusByBatch.get(batchCode) ?? new Map<string, Set<string>>()
      byColumn.set(column, (byColumn.get(column) ?? new Set<string>()).add(guruKey))
      gurusByBatch.set(batchCode, byColumn)

      const guru = profiles.get(guruKey)
      if (!guru) {
        const sameNumber = [...profiles.keys()].filter(k => k.split('-')[1] === guruKey.split('-')[1])
        const hint = sameNumber.length ? ` (same phone number: ${sameNumber.join(', ')})` : ''
        return block({ ...where, key: guruKey }, `${column} of batch ${batchCode} is a PRIMARY KEY in no registration row${hint}`)
      }
      gurus.push(guru)
      enroll(guruKey, batchCode, { profileId: guru.id, batchId: batch.id, role: g === 0 ? 'instructor' : 'ta', status: 'active', joinedAt })
    })

    // Whoever grades a student is the batch's first guru — what GURUVU GARU 1 has always meant.
    if (!gurus.length) return block(where, "no GURUVU GARU column names anyone, so the student's grades and exams have no evaluator")
    const evaluatorId = gurus[0].id
    seats.set(key, { batchId: batch.id, evaluatorId })

    for (const { index, chapterId } of chapterColumns) {
      const cell = row[index]
      if (cell === '' || cell == null) continue
      const grade = typeof cell === 'number' ? cell : Number(String(cell).trim())
      if (grade === NO_RESULT_GRADE) continue
      const level = GRADE_LEVELS[grade]
      if (level) {
        evaluations.push({ id: stableId('evaluation', course, key, chapterId), studentId: profile.id, chapterId, level, evaluatorId })
      } else {
        block(where, `grade cell "${tracker.titles[index]}" = ${JSON.stringify(cell)} is not 1-4, 0 (no result), -1 (L0) or -2 (absent)`)
      }
    }
  })

  for (const [batchCode, byColumn] of gurusByBatch) {
    for (const [column, keys] of byColumn) {
      if (keys.size > 1) report.guruDisagreements.push({ batchCode, column, values: [...keys] })
    }
  }

  // No column gives a batch's status, so it is derived (per product decision): active if any student
  // is active or the batch's year is the current one, else completed.
  const currentYear = new Date().getFullYear()
  const hasActiveStudent = new Set(
    [...enrollments.values()].filter(e => e.role === 'student' && e.status === 'active').map(e => e.batchId),
  )
  for (const batch of batches.values()) {
    batch.status = hasActiveStudent.has(batch.id) || batch.year === currentYear ? 'active' : 'completed'
  }

  return {
    batches: [...batches.values()].map(({ year: _year, track: _track, ...row }) => row),
    enrollments: [...enrollments.values()],
    evaluations,
    seats,
  }
}
