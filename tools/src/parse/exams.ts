import type { ExamRow, ProfileRow, TrackRow } from '../seed-types'
import { clean, columns, rowNumber, readSheet, stableId, type Ctx } from './sheet'

const PRIMARY_KEY_PATTERN = /^\d{1,3}-\d{6,15}-\d{4}$/
// The maximum of each graded component, in the order the rows list them (packages/db's examResult
// CHECKs and apps/api's grading.ts hold the same numbers).
const MARK_MAX = [50, 30, 20, 5, 5]

/**
 * Reads the "TRACK <n>" mark sheets: one completed exam, with its marks, per person per track.
 * `markHeaders` are the start of each of the five graded columns — the two workbooks name the same
 * 50/30/20/5/5 marks differently. The sheets' last columns (YEAR, SEMESTER, Telugu names, …) are
 * certificate print details and are not read, which is why an exam here has no date.
 */
export function parseExams(
  ctx: Ctx,
  input: {
    markHeaders: string[]
    tracks: TrackRow[]
    profiles: Map<string, ProfileRow>
    seats: Map<string, { batchId: string; evaluatorId: string }>
  },
) {
  const { course, report, block } = ctx
  const exams: ExamRow[] = []
  const seen = new Map<string, string>() // exam id -> where it was first read

  const sheetNames: string[] = ctx.workbook.SheetNames.filter((name: string) => /^TRACK \d+$/.test(name))
  for (const sheetName of sheetNames) {
    const trackOrder = Number(sheetName.split(' ')[1])
    const track = input.tracks[trackOrder - 1]
    const sheet = readSheet(ctx.workbook, sheetName, 1) // row 1 is a banner
    const col = columns(sheet)
    const markColumns = input.markHeaders.map(prefix => {
      const found = col.startingWith(prefix)
      if (found < 0) throw new Error(`Sheet "${sheetName}" has no column starting "${prefix}"`)
      return found
    })
    const keyColumn = col.index('PRIMARY KEY')
    const bonusColumn = col.startingWith('children bonus')
    const totalColumn = col.index('Total')
    if (bonusColumn < 0) throw new Error(`Sheet "${sheetName}" has no "Children Bonus" column`)

    sheet.rows.forEach((row, i) => {
      const key = clean(row[keyColumn])
      if (!PRIMARY_KEY_PATTERN.test(key)) return // empty template rows carry "--" (or nothing)
      const where = { sheet: sheetName, row: rowNumber(sheet, i), key }

      if (!track) return block(where, `there is no track ${trackOrder} (the tracker sheet has ${input.tracks.length})`)
      const marks = markColumns.map(c => row[c])
      // No marks means the exam has not been sat: the sheet's formulas still print total 0 and
      // "Below 65 — Reappear" on the row. That is not a fail, so it is not a result.
      if (!marks.every(m => typeof m === 'number')) return void report.examRowsNotSat.push(where)

      const profile = input.profiles.get(key)
      if (!profile) return block(where, 'PRIMARY KEY is in no row of the registration sheet')
      const seat = input.seats.get(key)
      if (!seat) return block(where, 'has marks, but the tracker sheet has no usable row for this person, so there is no batch to attach the exam to')

      const [aksharaShuddhi, swaraShuddhi, niyantranaAnargalata, shraavyata, pratishakyaGrammar] = marks as number[]
      const childrenBonus = Number(row[bonusColumn])
      const total = Number(row[totalColumn])
      const over = (marks as number[]).flatMap((m, x) =>
        m < 0 || m > MARK_MAX[x] || !Number.isInteger(m) ? [`${sheet.titles[markColumns[x]]} = ${m} (max ${MARK_MAX[x]})`] : [],
      )
      if (over.length) return block(where, `mark out of range: ${over.join(', ')}`)
      if (![0, 5, 10].includes(childrenBonus)) return block(where, `Children Bonus ${clean(row[bonusColumn])} is not 0, 5 or 10`)
      if (total !== (marks as number[]).reduce((sum, m) => sum + m, 0) + childrenBonus) {
        return block(where, `Total ${clean(row[totalColumn])} is not the sum of the marks and bonus`)
      }

      const id = stableId('exam', course, key, trackOrder)
      if (seen.has(id)) return block(where, `same person and track as ${seen.get(id)} — one result per person per track`)
      seen.set(id, `${sheetName} row ${where.row}`)
      exams.push({
        id,
        trackId: track.id,
        studentId: profile.id,
        batchId: seat.batchId,
        marks: { aksharaShuddhi, swaraShuddhi, niyantranaAnargalata, shraavyata, pratishakyaGrammar },
        childrenBonus,
        total,
        evaluatorId: seat.evaluatorId,
      })
    })
  }
  return exams
}
