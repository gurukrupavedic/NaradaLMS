import '@narada/env/load'
import * as fs from 'fs'
import * as path from 'path'
import { fileURLToPath } from 'url'
import { defineCommand, runMain } from 'citty'

import {
  batch,
  chapter,
  course,
  courseProfile,
  enrollment,
  evaluation,
  exam,
  examResult,
  getSchoolDb,
  profile,
  publicDb,
  registration,
  shutdownPools,
  type SchoolDbClient,
  track,
  user as userTable,
} from '@narada/db'
// Reusing the live API's own validators rather than re-deriving parallel checks: a bulk import
// that bypasses the HTTP layer should still never write a row the real API would reject.
import { CreateEnrollmentSchema as enrollSchema } from '@narada/api/src/enrollment/schema'
import {
  CreateEvaluationSchema,
  proficiencyLevelSchema,
} from '@narada/api/src/evaluations/schema'
import { gradeExam } from '@narada/api/src/exams/grading'
import { recordExamResult } from '@narada/api/src/exams/service'
import { RecordExamResultSchema } from '@narada/api/src/exams/schema'
import { CreateRegistrationSchema } from '@narada/api/src/registrations/schema'
import type { Dataset } from './seed-types'
import { addOrgMembers, assertCourseSlug, upsertSchool } from './school-helpers'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
// One directory per school, written by parse-excel-to-json.ts: seed-data/<school slug>/.
const SEED_DATA_ROOT = path.join(__dirname, '../../seed-data')
const CHUNK_SIZE = 1000

function chunk<T>(rows: T[], size: number): T[][] {
  const out: T[][] = []
  for (let i = 0; i < rows.length; i += size) out.push(rows.slice(i, i + size))
  return out
}

function readJson<T>(dataDir: string, fileName: string): T {
  const filePath = path.join(dataDir, fileName)
  if (!fs.existsSync(filePath)) {
    throw new Error(`Missing seed file: ${filePath} — run \`pnpm parse:excel\` first.`)
  }
  return JSON.parse(fs.readFileSync(filePath, 'utf-8')) as T
}

// The live API refuses a teacher's own evaluation at `level4` (only a graded track exam grants it),
// but a bulk import loads history, not a teacher grading today — the source spreadsheet has chapters
// already marked L4 (72 in the Vedam data). So the imported level is checked against the full
// list of levels rather than the teacher-gradable subset; everything else about the row is still
// checked against the API's own schema.
const createEvaluationSchema = CreateEvaluationSchema.extend({ level: proficiencyLevelSchema })

/**
 * What only this side can check: the rows against the API's own schemas (a bulk import that bypasses
 * the HTTP layer must never write a row the API would reject), and two rules about the whole school.
 * Everything about the spreadsheet itself — keys, marks, batch codes — the parser has already checked
 * and reported with Excel row numbers, so it is not checked twice.
 */
function validate(data: Dataset, importedAt: Date): string[] {
  const errors: string[] = []
  const problems = (label: string, result: { success: boolean; error?: { issues: { path: PropertyKey[]; message: string }[] } }) => {
    if (!result.success) errors.push(`${label}: ${result.error!.issues.map(i => `${i.path.join('.')} ${i.message}`.trim()).join('; ')}`)
  }

  for (const c of data.courses) {
    try {
      assertCourseSlug(c.slug)
    } catch (e) {
      errors.push((e as Error).message)
    }
  }
  for (const e of data.enrollments) problems(`enrollment ${e.profileId}/${e.batchId}`, enrollSchema.safeParse(e))
  for (const r of data.registrations) problems(`registration ${r.sourceKey}`, CreateRegistrationSchema.safeParse(r))
  for (const ev of data.evaluations) problems(`evaluation ${ev.id}`, createEvaluationSchema.safeParse(ev))

  // Exams are recorded through the API's own `recordExamResult`, which derives the children's bonus,
  // total and outcome itself rather than taking the sheet's. The sheet's exam has no date, so the
  // sitting is dated the import — its year decides the bonus. Grade each exam here the same way and
  // name every one whose result would differ from what the sheet certified, before anything is
  // written: a bonus lost to the sitting date moving would silently change a certification.
  const yearOfBirth = new Map(data.profiles.map(p => [p.id, p.yearOfBirth]))
  for (const x of data.exams) {
    problems(`exam ${x.id}`, RecordExamResultSchema.safeParse(x.marks))
    const born = yearOfBirth.get(x.studentId)
    if (born === undefined) {
      errors.push(`exam ${x.id}: student ${x.studentId} has no profile in this import, so the children's bonus can't be worked out`)
      continue
    }
    const graded = gradeExam(x.marks, born, importedAt.getUTCFullYear())
    if (graded.total !== x.total || graded.childrenBonus !== x.childrenBonus) {
      errors.push(
        `exam ${x.id}: the sheet has children's bonus ${x.childrenBonus} / total ${x.total}, but the app grades it ` +
          `bonus ${graded.childrenBonus} / total ${graded.total} for a sitting in ${importedAt.getUTCFullYear()} (born ${born})`,
      )
    }
  }

  // A student holds at most one active seat per course. The database refuses a violation with one
  // opaque error midway through the transaction, so name every offender up front.
  const courseOfTrack = new Map(data.tracks.map(t => [t.id, t.courseSlug]))
  const courseOfBatch = new Map(data.batches.map(b => [b.id, courseOfTrack.get(b.trackId)]))
  const seats = new Map<string, number>()
  for (const e of data.enrollments) {
    if (e.role !== 'student' || e.status !== 'active') continue
    const seat = `${e.profileId} in course "${courseOfBatch.get(e.batchId)}"`
    seats.set(seat, (seats.get(seat) ?? 0) + 1)
  }
  for (const [seat, count] of seats) if (count > 1) errors.push(`profile ${seat}: ${count} active student seats — only one is allowed`)

  // Can each person reach any content afterwards? A non-admin is "part of" a course only through an
  // enrollment in it or an approved registration that converted to their profile
  // (AccessPolicy#canReadCourseContent); every registration here is approved, so anyone with neither
  // an enrollment nor a registration reads nothing.
  const reachable = new Set([...data.enrollments.map(e => e.profileId), ...data.registrations.map(r => r.profileId)])
  for (const p of data.profiles) {
    if (!reachable.has(p.id)) errors.push(`profile ${p.sourceKey} (${p.name}): no enrollment and no registration — part of no course, would read no content`)
  }
  return errors
}

const dataCmd = defineCommand({
  meta: { description: 'Import parsed spreadsheet data (seed-data/<school>/*.json) into a real school.' },
  args: {
    slug: {
      type: 'string',
      default: 'slmts',
      description: 'School org slug to import into; its data is read from seed-data/<slug>/ unless --dataDir is given.',
    },
    name: { type: 'string', description: 'School display name (defaults to uppercased slug).' },
    dataDir: { type: 'string', description: 'Directory containing the parsed seed-data JSON files (default seed-data/<slug>).' },
    commit: {
      type: 'boolean',
      default: false,
      description: 'Actually write to the database. Without this flag, only validates and reports.',
    },
    'allow-existing': {
      type: 'boolean',
      default: false,
      description:
        'Tolerate rows that already exist (an id or unique key collision). Without it, a table that inserts ' +
        'fewer rows than it loaded aborts the import — a skipped row is otherwise silent.',
    },
  },
  async run({ args }) {
    const dataDir = args.dataDir ?? path.join(SEED_DATA_ROOT, args.slug)
    // The workbooks carry no dates, so everything imported is stamped with the import itself. A
    // sitting's result is stamped a millisecond after the marks it was imported with (see the
    // exams block below).
    const importedAt = new Date()

    try {
      const data: Dataset = {
        courses: readJson(dataDir, 'courses.json'),
        tracks: readJson(dataDir, 'tracks.json'),
        chapters: readJson(dataDir, 'chapters.json'),
        batches: readJson(dataDir, 'batches.json'),
        users: readJson(dataDir, 'users.json'),
        profiles: readJson(dataDir, 'profiles.json'),
        registrations: readJson(dataDir, 'registrations.json'),
        enrollments: readJson(dataDir, 'enrollments.json'),
        evaluations: readJson(dataDir, 'evaluations.json'),
        exams: readJson(dataDir, 'exams.json'),
      }
      const { courses, tracks, chapters, batches, users, profiles, registrations, enrollments, evaluations, exams } = data

      console.log(
        `Loaded ${courses.length} courses (${courses.map(c => c.slug).join(', ')}), ${users.length} users, ` +
          `${profiles.length} profiles, ${registrations.length} registrations, ${tracks.length} tracks, ` +
          `${chapters.length} chapters, ${batches.length} batches, ${enrollments.length} enrollments, ` +
          `${evaluations.length} evaluations, ${exams.length} exams from ${dataDir}`,
      )

      const errors = validate(data, importedAt)
      // Findings the parser could not load around — a row with an impossible mark, a guru who is
      // nobody, … — are the spreadsheet's to fix, not this importer's to skip.
      const report = readJson<{ blocking: { sheet: string; row?: number; key?: string; message: string }[] }>(dataDir, '_report.json')
      errors.unshift(
        ...report.blocking.map(b => `${b.sheet}${b.row ? ` row ${b.row}` : ''}${b.key ? ` [${b.key}]` : ''}: ${b.message}`),
      )
      if (errors.length > 0) {
        console.error(`❌ ${errors.length} problem(s) found before writing anything:`)
        for (const e of errors.slice(0, 20)) console.error(`  - ${e}`)
        if (errors.length > 20) console.error(`  ...and ${errors.length - 20} more`)
        throw new Error(
          'Validation failed — fix the spreadsheet, re-run `pnpm parse:excel`, and check ' +
            `${path.join(dataDir, '_report.json')} for the full list.`,
        )
      }
      console.log('✅ All rows pass validation against the live API schemas, and every person can reach a course.')

      if (!args.commit) {
        console.log('Dry run only — pass --commit to write to the database. No rows were inserted.')
        return
      }

      const school = await upsertSchool(args.slug, args.name ?? args.slug.toUpperCase())
      const schoolDb = getSchoolDb(school.id)
      console.log(`Importing into organization "${school.slug}" (${school.id})`)

      // Roster rows can belong to people who already have a production account (own email/phone
      // registered outside this import). Their user.id/email/phoneNumber are unique constraints, so
      // inserting a second row for the same identity fails — the fix is to reuse the existing user's
      // id rather than insert a duplicate.
      const emails = users.map(u => u.email)
      const phones = users.flatMap(u => (u.phoneNumber ? [u.phoneNumber] : []))
      const existingUsers = await publicDb.query.user.findMany({
        where: (t, { inArray, or }) => or(inArray(t.email, emails), inArray(t.phoneNumber, phones)),
        columns: { id: true, email: true, phoneNumber: true, name: true },
      })
      const existingByEmail = new Map(existingUsers.map(u => [u.email, u]))
      const existingByPhone = new Map(
        existingUsers.filter(u => u.phoneNumber).map(u => [u.phoneNumber as string, u]),
      )

      const idRemap = new Map<string, string>()
      for (const row of users) {
        const emailMatch = existingByEmail.get(row.email)
        const phoneMatch = row.phoneNumber ? existingByPhone.get(row.phoneNumber) : undefined
        if (emailMatch && phoneMatch && emailMatch.id !== phoneMatch.id) {
          throw new Error(
            `user ${row.id} (${row.email} / ${row.phoneNumber}) matches two different existing ` +
              `production users — by email: ${emailMatch.id}, by phone: ${phoneMatch.id}. Resolve manually.`,
          )
        }
        const existing = emailMatch ?? phoneMatch
        if (existing && existing.id !== row.id) idRemap.set(row.id, existing.id)
      }

      if (idRemap.size > 0) {
        console.log(`⚠️  ${idRemap.size} roster user(s) already have a production account — reusing them:`)
        for (const row of users) {
          const existing = idRemap.get(row.id)
          if (!existing) continue
          const match = existingByEmail.get(row.email) ?? existingByPhone.get(row.phoneNumber ?? '')
          console.log(`  - "${row.name}" <${row.email}> -> existing user ${existing} ("${match?.name}")`)
        }
      }

      const usersToInsert = users.filter(u => !idRemap.has(u.id))
      // `sourceKey` is for audit only, not a column; a person whose login already exists keeps it.
      const remappedProfiles = profiles.map(({ sourceKey: _sourceKey, ...p }) => ({ ...p, userId: idRemap.get(p.userId) ?? p.userId }))

      // publicDb: user, then org membership for every imported user.
      let usersInserted = 0
      for (const rows of chunk(usersToInsert, CHUNK_SIZE)) {
        usersInserted += (
          await publicDb.insert(userTable).values(rows).onConflictDoNothing({ target: userTable.id }).returning({ id: userTable.id })
        ).length
      }
      const memberUserIds = [...new Set(users.map(u => idRemap.get(u.id) ?? u.id))]
      const membersAdded = await addOrgMembers(school.id, memberUserIds, 'member')
      console.log(
        `✅ Imported ${usersInserted} new users (${idRemap.size} reused existing accounts, ` +
          `${usersToInsert.length - usersInserted} already present) + ${membersAdded} org memberships ` +
          `(${memberUserIds.length - membersAdded} already members).`,
      )

      // Scoped school DB, in FK dependency order, inside one transaction per school.
      const inserted: Record<string, number> = {}
      await schoolDb.transaction(async tx => {
        // `onConflictDoNothing` makes a re-run safe, but it also makes a collision (a batch code
        // already in use by another course, a track order already taken) drop the row without a
        // word — and the FK errors that follow name the symptom, not the cause. So every table
        // counts what it actually inserted, and a shortfall aborts the whole transaction.
        const record = (label: string, loaded: number, actual: number) => {
          inserted[label] = actual
          if (actual !== loaded && !args['allow-existing']) {
            throw new Error(
              `${label}: loaded ${loaded} rows but inserted ${actual} — the rest already exist or collide ` +
                `on a unique key. Nothing was committed. Rerun with --allow-existing if that is expected.`,
            )
          }
        }

        // Every course gets a row; tracks are stamped with it, and batches and enrollments carry
        // their track's/batch's course (the schema's composite foreign keys refuse anything else).
        await tx
          .insert(course)
          .values(courses.map(c => ({ slug: c.slug, name: c.name })))
          .onConflictDoNothing({ target: course.slug })
        const courseRows = await tx.query.course.findMany()
        const courseIdBySlug = new Map(courseRows.map(c => [c.slug, c.id]))
        for (const c of courses) {
          if (!courseIdBySlug.has(c.slug)) throw new Error(`Course "${c.slug}" missing after insert`)
          console.log(`Importing into course "${c.slug}" (${courseIdBySlug.get(c.slug)})`)
        }

        const courseIdOfTrack = new Map(tracks.map(t => [t.id, courseIdBySlug.get(t.courseSlug)!]))
        const courseIdOfBatch = new Map(batches.map(b => [b.id, courseIdOfTrack.get(b.trackId)!]))

        let n = 0
        for (const rows of chunk(tracks, CHUNK_SIZE)) {
          const values = rows.map(({ courseSlug, ...r }) => ({ ...r, courseId: courseIdBySlug.get(courseSlug)! }))
          n += (await tx.insert(track).values(values).onConflictDoNothing().returning({ id: track.id })).length
        }
        record('track', tracks.length, n)

        n = 0
        for (const rows of chunk(chapters, CHUNK_SIZE)) {
          n += (await tx.insert(chapter).values(rows).onConflictDoNothing().returning({ id: chapter.id })).length
        }
        record('chapter', chapters.length, n)

        n = 0
        for (const rows of chunk(batches, CHUNK_SIZE)) {
          const values = rows.map(r => ({
            ...r,
            courseId: courseIdOfTrack.get(r.trackId)!,
            startDate: r.startDate ? new Date(r.startDate) : null,
          }))
          n += (await tx.insert(batch).values(values).onConflictDoNothing().returning({ id: batch.id })).length
        }
        record('batch', batches.length, n)

        n = 0
        for (const rows of chunk(remappedProfiles, CHUNK_SIZE)) {
          n += (await tx.insert(profile).values(rows).onConflictDoNothing().returning({ id: profile.id })).length
        }
        record('profile', remappedProfiles.length, n)

        // An approved registration per registration-sheet row, linked to the profile it produced —
        // the shape the app itself leaves when an admin approves an application, and what makes a
        // person "part of" the course when they have no batch yet. `createdAt` is Jan 1 of the year
        // the sheet says they registered (it has no finer date).
        n = 0
        for (const rows of chunk(registrations, CHUNK_SIZE)) {
          const values = rows.map(({ courseSlug, profileId, sourceKey: _sourceKey, registeredYear, ...columns }) => ({
            ...columns,
            status: 'approved' as const,
            courseId: courseIdBySlug.get(courseSlug)!,
            convertedProfileId: profileId,
            createdAt: registeredYear ? new Date(`${registeredYear}-01-01T00:00:00.000Z`) : new Date(),
          }))
          n += (await tx.insert(registration).values(values).onConflictDoNothing().returning({ id: registration.id })).length
        }
        record('registration', registrations.length, n)

        // ...and the profile's course-level record for that course, carrying what the application said
        // about it (goal, starting point, comments) — what approving one in the app writes.
        n = 0
        for (const rows of chunk(registrations, CHUNK_SIZE)) {
          const values = rows.map(r => ({
            profileId: r.profileId,
            courseId: courseIdBySlug.get(r.courseSlug)!,
            learningGoal: r.learningGoal,
            currentProficiency: r.currentProficiency,
            comments: r.comments,
          }))
          n += (await tx.insert(courseProfile).values(values).onConflictDoNothing().returning({ profileId: courseProfile.profileId })).length
        }
        record('courseProfile', registrations.length, n)

        n = 0
        for (const rows of chunk(enrollments, CHUNK_SIZE)) {
          const values = rows.map(r => ({
            ...r,
            courseId: courseIdOfBatch.get(r.batchId)!,
            joinedAt: r.joinedAt ? new Date(r.joinedAt) : null,
          }))
          n += (await tx.insert(enrollment).values(values).onConflictDoNothing().returning({ profileId: enrollment.profileId })).length
        }
        record('enrollment', enrollments.length, n)

        n = 0
        for (const rows of chunk(evaluations, CHUNK_SIZE)) {
          const values = rows.map(r => ({ ...r, evaluatedAt: importedAt }))
          n += (await tx.insert(evaluation).values(values).onConflictDoNothing().returning({ id: evaluation.id })).length
        }
        record('evaluation', evaluations.length, n)

        // A completed sitting per exam sheet row, recorded through the API's own
        // `recordExamResult` so the business rules apply exactly as when a result is entered in the
        // app: the children's bonus, total and outcome are derived (validate() already checked they
        // match the sheet), and a passing result is written as the level on every published chapter
        // of the track — which is what makes the student eligible for later steps that read chapter
        // marks (e.g. requesting a sitting). Each exam is inserted `scheduled` and then recorded.
        //
        // The workbooks record no exam date, and `scheduledAt` is NOT NULL, so every imported exam
        // is dated the moment of import — the true date is unknown, not the import's to invent. The
        // result is stamped a millisecond after the tracker marks (same explicit clock as those, not
        // the database's `now()`, which is a single instant for the whole transaction) so the exam
        // is the latest word on each chapter, as it is in the app.
        // `tx` stands in for the pool-level client the services are typed against: a transaction has
        // no `$client`, but the services only use its query methods and a nested `transaction`
        // (a savepoint), so the whole import still commits or rolls back as one.
        const resultAt = new Date(importedAt.getTime() + 1)
        n = 0
        let results = 0
        for (const x of exams) {
          const insertedExam = await tx
            .insert(exam)
            .values({
              id: x.id,
              trackId: x.trackId,
              studentId: x.studentId,
              scheduledAt: importedAt,
              status: 'scheduled' as const,
            })
            .onConflictDoNothing()
            .returning({ id: exam.id })
          if (insertedExam.length === 0) continue // already imported; its result is already recorded
          n += 1
          await recordExamResult({ db: tx as unknown as SchoolDbClient }, x.id, x.evaluatorId, x.marks, { evaluatedAt: resultAt })
          results += 1
        }
        record('exam', exams.length, n)
        record('examResult', exams.length, results)
      })

      console.log(
        `✅ Import committed: ${courses.length} courses, ${inserted.track} tracks, ${inserted.chapter} chapters, ` +
          `${inserted.batch} batches, ${inserted.profile} profiles, ${inserted.registration} registrations, ` +
          `${inserted.courseProfile} course profiles, ${inserted.enrollment} enrollments, ${inserted.evaluation} evaluations, ${inserted.exam} exams with results.`,
      )
    } finally {
      await shutdownPools()
    }
  },
})

runMain(
  defineCommand({
    meta: {
      name: 'import-school',
      description: 'Import a school roster from the parsed spreadsheet data (seed-data/<school>/).',
    },
    subCommands: { data: dataCmd },
  }),
)
