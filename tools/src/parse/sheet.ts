import XLSXModule from 'xlsx'
// Deliberately not `uuidv7` from `@narada/db`: importing anything from that package eagerly opens
// a live Postgres pool and validates the full app env. The parser only turns spreadsheets into
// JSON — it must run standalone, with no DB or environment configured.
import { v5 as uuidv5 } from 'uuid'

import type { Report, Where } from '../seed-types'

// Handle CommonJS / ESM default export compatibility for SheetJS
export const XLSX = (XLSXModule as any).default || XLSXModule

// Any fixed UUID would do; changing this changes every id, so it must never change.
const ID_NAMESPACE = 'b3c1f0a2-7d54-4e0b-9a6f-2f5f0f8b9c11'

/** An id derived from a row's natural key, so parsing twice gives identical output and re-importing is a no-op. */
export const stableId = (...parts: (string | number)[]) => uuidv5(parts.join('|'), ID_NAMESPACE)

export const digits = (value: unknown) => String(value ?? '').replace(/\D/g, '')
export const clean = (value: unknown) => String(value ?? '').replace(/\s+/g, ' ').trim()
export const orNull = (value: unknown) => clean(value) || null
/** Header comparison key: the sheets disagree on case and embed "\r\n" in titles. */
export const normHeader = (header: unknown) => clean(header).toLowerCase()

export type Sheet = {
  name: string
  /** 0-based index of the header row. */
  headerRow: number
  /** Normalised headers, by column index. */
  headers: string[]
  /** Headers as written (whitespace collapsed only) — chapter titles come from these. */
  titles: string[]
  rows: unknown[][]
}

export function readSheet(workbook: any, name: string, headerRow = 0): Sheet {
  const worksheet = workbook.Sheets[name]
  if (!worksheet) {
    throw new Error(`Could not find "${name}" sheet. Available sheets: ${workbook.SheetNames.join(', ')}`)
  }
  const all: unknown[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '', raw: true })
  const headerCells = all[headerRow] ?? []
  return { name, headerRow, headers: headerCells.map(normHeader), titles: headerCells.map(clean), rows: all.slice(headerRow + 1) }
}

/** The Excel row number (1-based) of a sheet's i-th data row. */
export const rowNumber = (sheet: Sheet, i: number) => sheet.headerRow + i + 2

/** Column lookup by normalised header (first match). `index` throws when the column is missing. */
export function columns(sheet: Sheet) {
  const optional = (name: string) => sheet.headers.indexOf(normHeader(name))
  return {
    optional,
    index(name: string): number {
      const found = optional(name)
      if (found < 0) throw new Error(`Sheet "${sheet.name}" has no "${name}" column`)
      return found
    },
    startingWith: (prefix: string) => sheet.headers.findIndex(h => h.startsWith(normHeader(prefix))),
  }
}

/** What every parsing step needs: the school's report, and a way to record a blocking finding. */
export type Ctx = {
  school: string
  /** The course slug — every id below it is derived from it. */
  course: string
  workbook: any
  report: Report
  block: (where: Where, message: string) => void
}
