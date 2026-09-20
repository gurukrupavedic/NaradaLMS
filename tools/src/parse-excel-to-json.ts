import * as fs from 'fs'
import * as path from 'path'
import { fileURLToPath } from 'url'

import type { Dataset, Report } from './seed-types'
import { parseCurriculum } from './parse/curriculum'
import { parseExams } from './parse/exams'
import { parsePeople, type SharedUsers } from './parse/people'
import { readSheet, XLSX, type Ctx } from './parse/sheet'
import { parseTracker } from './parse/tracker'

// The source workbooks (seed-data/slmts.xlsx, seed-data/rr.xlsx) and everything parsed from them
// (seed-data/<school>/) live in one folder that is gitignored: it is real people's names, phone
// numbers and emails, and none of it belongs in Git. Both are overridable so the parser can be
// pointed at a scratch copy of the workbooks.
const SEED_DATA_DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), '../../seed-data')
const SOURCE_DIR = process.env.SEED_SOURCE_DIR ?? SEED_DATA_DIR
const OUTPUT_DIR = process.env.SEED_OUTPUT_DIR ?? SEED_DATA_DIR

// Each workbook is its own school with one course. Every workbook has a registration sheet (one row per
// admitted person, keyed by a PRIMARY KEY of the form <country code>-<phone>-<year of birth>), an
// "ALL-TRACKERS" sheet (one row per student in their batch, naming its gurus by PRIMARY KEY and
// grading every chapter, each track closed by an "L4 Cert Status" column) and a "TRACK <n>" mark sheet
// per track. The PRIMARY KEY is the same person on every sheet, so it is the only identity used here.
//
// Nothing is dropped or repaired: a row that cannot be loaded as written is a *blocking finding* with
// its Excel row number, and the importer refuses to run until the spreadsheet is fixed. A course slug
// is a URL segment, so the schema requires it lower-case.
const SOURCES = [
  {
    school: { slug: 'slmts', name: 'SLMTS' },
    course: { slug: 'ved', name: 'Vedam' },
    file: 'slmts.xlsx',
    registrationSheet: 'Master_Registrations',
    batchPrefix: 'VED',
    // The five graded marks (50/30/20/5/5), as the start of each header. The workbooks name them
    // differently and they line up by maximum.
    markHeaders: ['akshara shuddhi', 'swara shuddhi', 'niyantrana', 'shraavyata', 'pratishakya grammar'],
  },
  {
    school: { slug: 'rr', name: 'RR' },
    course: { slug: 'pur', name: 'Puranokta' },
    file: 'rr.xlsx',
    registrationSheet: 'RRMasterRegistrations',
    batchPrefix: 'PUR',
    markHeaders: ['akshara shuddhi', 'anargalata', 'niyantrana', 'melodious rendering', 'grammar / shastra'],
  },
]

function parseSchool(source: (typeof SOURCES)[number], shared: SharedUsers) {
  const file = path.join(SOURCE_DIR, source.file)
  if (!fs.existsSync(file)) throw new Error(`File not found at: ${file}`)
  console.log(`🚀 ${source.file} → school "${source.school.slug}", course "${source.course.slug}"`)

  const report: Report = {
    school: source.school.slug,
    blocking: [],
    enrollmentRoleOverrides: [],
    batchCodeAssumptions: [],
    guruDisagreements: [],
    examRowsNotSat: [],
  }
  const workbook = XLSX.readFile(file)
  const ctx: Ctx = {
    school: source.school.slug,
    course: source.course.slug,
    workbook,
    report,
    block: (where, message) => report.blocking.push({ ...where, message }),
  }

  const people = parsePeople(ctx, source.registrationSheet, shared)
  const tracker = readSheet(workbook, 'ALL-TRACKERS')
  const curriculum = parseCurriculum(tracker, ctx.course)
  const { batches, enrollments, evaluations, seats } = parseTracker(ctx, tracker, {
    batchPrefix: source.batchPrefix,
    profiles: people.profiles,
    tracks: curriculum.tracks,
    chapterColumns: curriculum.chapterColumns,
  })
  const exams = parseExams(ctx, { markHeaders: source.markHeaders, tracks: curriculum.tracks, profiles: people.profiles, seats })

  const dataset: Dataset = {
    courses: [source.course],
    tracks: curriculum.tracks,
    chapters: curriculum.chapters,
    batches,
    users: people.users,
    profiles: [...people.profiles.values()],
    registrations: people.registrations,
    enrollments,
    evaluations,
    exams,
  }
  return { dataset, report }
}

function main() {
  const shared: SharedUsers = { byPhone: new Map(), emailOwners: new Map() }
  let blocked = 0

  for (const source of SOURCES) {
    const { dataset, report } = parseSchool(source, shared)

    const dir = path.join(OUTPUT_DIR, source.school.slug)
    fs.mkdirSync(dir, { recursive: true })
    const write = (name: string, data: unknown) => fs.writeFileSync(path.join(dir, name), JSON.stringify(data, null, 2))
    for (const [name, rows] of Object.entries(dataset)) write(`${name}.json`, rows)
    write('_report.json', report)

    const n = (rows: unknown[]) => rows.length
    console.log(`
✅ ${source.school.slug} → seed-data/${source.school.slug}/
   ${Object.entries(dataset).map(([name, rows]) => `${name}: ${n(rows)}`).join('  ')}
   for review in _report.json: ${n(report.enrollmentRoleOverrides)} guru/student role conflicts (guru role kept), ${n(report.guruDisagreements)} batches whose guru columns disagree, ${n(report.batchCodeAssumptions)} batches with no track in their code, ${n(report.examRowsNotSat)} mark rows with no marks (not sat)`)

    if (report.blocking.length) {
      blocked += report.blocking.length
      console.log(`\n❌ ${report.blocking.length} BLOCKING finding(s) in ${source.school.slug} — the importer will refuse to run until these are fixed in the spreadsheet:`)
      for (const b of report.blocking.slice(0, 25)) console.log(`   ${b.sheet}${b.row ? ` row ${b.row}` : ''}${b.key ? ` [${b.key}]` : ''}: ${b.message}`)
      if (report.blocking.length > 25) console.log(`   …and ${report.blocking.length - 25} more (see seed-data/${source.school.slug}/_report.json)`)
    }
  }
  if (blocked) process.exitCode = 1
}

try {
  main()
} catch (err) {
  console.error('❌ Error parsing the workbooks:', err)
  process.exit(1)
}
