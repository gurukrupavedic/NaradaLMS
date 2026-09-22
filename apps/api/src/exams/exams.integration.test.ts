import { eq } from 'drizzle-orm'
import { afterEach, describe, expect, it } from 'vitest'

import { chapter, examResult } from '@narada/db'

import { withTwoConnections, type TxConnection } from '../testing/concurrency'
import { destroyTestWorld } from '../testing/cleanup'
import {
  createBatch,
  createChapter,
  createEvaluation,
  createExam,
  createExamResult,
  createProfile,
  createTestSchool,
  createTrack,
  enroll,
  type ExamRow,
  type TestWorld,
  defaultCourseId,
} from '../testing/fixtures'
import { findById, findByIdWithDetail, findMany, findResultsForStudent } from './repository'
import { recordExamResult } from './service'

let world: TestWorld | undefined

afterEach(async () => {
  if (world) {
    await destroyTestWorld(world)
    world = undefined
  }
})

/**
 * These SQL statements are hand-copied from `src/exams/repository.ts` (`complete`, `insertResult`)
 * and from `src/exams/service.ts` (`recordExamResult`'s transaction shape: complete first, then
 * insert the result), because the barrier helper (`withTwoConnections`) drives two raw `pg`
 * connections directly rather than two `SchoolDbClient`s — `getSchoolDb` caches one pool per
 * organization, so there is no way to get two *distinct* backend connections/PIDs through it. If
 * `repository.ts`'s guarded predicates ever change, these literals must be updated to match.
 */
// Guard: the status read before the transaction opened. A second concurrent result (the exam is by
// then `completed`) and a concurrent cancellation both fail it.
const COMPLETE_GUARDED_SQL = `
  UPDATE exam
  SET status = 'completed'
  WHERE id = $1 AND status = $2
`
const INSERT_RESULT_SQL = `
  INSERT INTO "examResult" ("examId", "aksharaShuddhi", "swaraShuddhi", "niyantranaAnargalata",
    shraavyata, "pratishakyaGrammar", "childrenBonus", total, outcome, "evaluatorId")
  VALUES ($1, 45, 27, 18, 4, 4, 0, 98, 'prathamaSreni', $2)
`
const CANCEL_GUARDED_SQL = `
  UPDATE exam
  SET status = 'cancelled'
  WHERE id = $1 AND status = $2
`

async function seedScheduledExam() {
  const w = await createTestSchool()
  const trackRow = await createTrack(w)
  const batchRow = await createBatch(w, trackRow)
  const studentProfile = await createProfile(w, { name: 'Student', yearOfBirth: 1990 })
  await enroll(w, studentProfile, batchRow, 'student')
  const evaluatorAProfile = await createProfile(w, { name: 'Evaluator A' })
  const evaluatorBProfile = await createProfile(w, { name: 'Evaluator B' })
  const examRow = await createExam(w, {
    student: studentProfile,
    track: trackRow,
    batch: batchRow,
    status: 'scheduled',
  })

  return { world: w, examRow, trackRow, batchRow, studentProfile, evaluatorAProfile, evaluatorBProfile }
}

/** Runs the guarded-complete + result-insert sequence and returns whether it won. */
async function attemptRecordResult(
  conn: TxConnection,
  examId: string,
  evaluatorId: string,
  expectedStatus: string,
): Promise<{ won: boolean }> {
  const completed = await conn.query(COMPLETE_GUARDED_SQL, [examId, expectedStatus])
  if ((completed.rowCount ?? 0) !== 1) {
    return { won: false }
  }

  await conn.query(INSERT_RESULT_SQL, [examId, evaluatorId])
  return { won: true }
}

describe('exam result concurrency (matrix item 2: two simultaneous results)', () => {
  it('exactly one result persists, the exam completes exactly once, and the loser is rolled back (a real 0-row guarded update)', async () => {
    const seed = await seedScheduledExam()
    world = seed.world

    let aRowCount: number | undefined
    let bRowCount: number | undefined

    await withTwoConnections(seed.world.schemaName, async (connA, connB) => {
      await connA.begin()
      await connB.begin()

      // Both attempt the guarded UPDATE on the same exam row "concurrently" — issued without
      // awaiting, so whichever the Postgres server actually admits first resolves quickly, and the
      // other is genuinely blocked on that row's lock until the winner's transaction ends.
      const updateA = connA.query(COMPLETE_GUARDED_SQL, [seed.examRow.id, 'scheduled'])
      const updateB = connB.query(COMPLETE_GUARDED_SQL, [seed.examRow.id, 'scheduled'])

      const first = await Promise.race([
        updateA.then(result => ({ who: 'a' as const, result })),
        updateB.then(result => ({ who: 'b' as const, result })),
      ])

      if (first.who === 'a') {
        aRowCount = first.result.rowCount ?? 0
        expect(aRowCount).toBe(1)
        await connA.query(INSERT_RESULT_SQL, [seed.examRow.id, seed.evaluatorAProfile.id])
        // Committing the winner releases the row lock, letting B's blocked UPDATE proceed.
        await connA.commit()
        bRowCount = (await updateB).rowCount ?? 0
        expect(bRowCount).toBe(0)
        // Mirrors recordExamResult's transaction: a 0-row guarded update throws, rolling back the
        // whole transaction.
        await connB.rollback()
      } else {
        bRowCount = first.result.rowCount ?? 0
        expect(bRowCount).toBe(1)
        await connB.query(INSERT_RESULT_SQL, [seed.examRow.id, seed.evaluatorBProfile.id])
        await connB.commit()
        aRowCount = (await updateA).rowCount ?? 0
        expect(aRowCount).toBe(0)
        await connA.rollback()
      }
    })

    expect([aRowCount, bRowCount].filter(count => count === 1)).toHaveLength(1)
    expect([aRowCount, bRowCount].filter(count => count === 0)).toHaveLength(1)

    const results = await seed.world.schoolDb.query.examResult.findMany({
      where: (t, { eq: eqCol }) => eqCol(t.examId, seed.examRow.id),
    })
    expect(results).toHaveLength(1)

    const finalExam = await seed.world.schoolDb.query.exam.findFirst({
      where: (t, { eq: eqCol }) => eqCol(t.id, seed.examRow.id),
    })
    expect(finalExam?.status).toBe('completed')
  })
})

describe('exam result vs. cancellation race (matrix item 1, both orders)', () => {
  it(
    'order 1 (cancellation commits first, then result): the result loses — ' +
      "repository.complete's status predicate no longer matches once A's cancellation has " +
      "committed, so B records nothing.",
    async () => {
      const seed = await seedScheduledExam()
      world = seed.world

      await withTwoConnections(seed.world.schemaName, async (connA, connB) => {
        await connA.begin()
        await connB.begin()

        // A cancels (guarded on status = 'scheduled', matching updateGuarded's CAS) and commits
        // first, entirely before B starts its result-recording attempt.
        const cancelResult = await connA.query(CANCEL_GUARDED_SQL, [seed.examRow.id, 'scheduled'])
        expect(cancelResult.rowCount).toBe(1)
        await connA.commit()

        // B still believes the exam is 'scheduled' (the status it read before A's cancel
        // committed) — exactly the expectedStatus recordExamResult would have captured.
        const { won } = await attemptRecordResult(
          connB,
          seed.examRow.id,
          seed.evaluatorAProfile.id,
          'scheduled',
        )
        expect(won).toBe(false)
        // A losing guarded update means recordExamResult's transaction throws and rolls back —
        // mirror that here by rolling back B instead of committing.
        await connB.rollback()
      })

      const finalExam = await seed.world.schoolDb.query.exam.findFirst({
        where: (t, { eq: eqCol }) => eqCol(t.id, seed.examRow.id),
      })
      // The cancellation stands, no result was ever recorded.
      expect(finalExam?.status).toBe('cancelled')
      const results = await seed.world.schoolDb.query.examResult.findMany()
      expect(results).toHaveLength(0)
    },
  )

  it(
    'order 2 (result commits first, then cancellation): the cancel loses because its guarded ' +
      "UPDATE's status predicate no longer matches (status is 'completed', not 'scheduled')",
    async () => {
      const seed = await seedScheduledExam()
      world = seed.world

      await withTwoConnections(seed.world.schemaName, async (connA, connB) => {
        await connA.begin()
        await connB.begin()

        const { won } = await attemptRecordResult(
          connA,
          seed.examRow.id,
          seed.evaluatorAProfile.id,
          'scheduled',
        )
        expect(won).toBe(true)
        await connA.commit()

        // B's cancellation is guarded on status = 'scheduled' (the status it would have read
        // before attempting the transition) — since the exam is now 'completed', 0 rows match.
        const cancelResult = await connB.query(CANCEL_GUARDED_SQL, [seed.examRow.id, 'scheduled'])
        expect(cancelResult.rowCount).toBe(0)
        await connB.rollback()
      })

      const finalExam: ExamRow | undefined = await seed.world.schoolDb.query.exam.findFirst({
        where: (t, { eq: eqCol }) => eqCol(t.id, seed.examRow.id),
      })
      expect(finalExam?.status).toBe('completed')
    },
  )
})

describe('recordExamResult (real Postgres, end to end)', () => {
  async function seedTrackWithChapters(yearOfBirth: number | null = 1990) {
    const w = await createTestSchool()
    const trackRow = await createTrack(w)
    const chapters = [
      await createChapter(w, trackRow, { status: 'published' }),
      await createChapter(w, trackRow, { status: 'published' }),
    ]
    const draft = await createChapter(w, trackRow, { status: 'draft' })
    const archived = await createChapter(w, trackRow, { status: 'published' })
    await w.schoolDb.update(chapter).set({ archived: true }).where(eq(chapter.id, archived.id))

    const batchRow = await createBatch(w, trackRow)
    const student = await createProfile(w, { name: 'Student', yearOfBirth })
    await enroll(w, student, batchRow, 'student')
    const admin = await createProfile(w, { name: 'Admin' })
    const examRow = await createExam(w, {
      student,
      track: trackRow,
      batch: batchRow,
      scheduledAt: new Date('2026-06-15T10:00:00Z'),
    })
    return { w, trackRow, chapters, draft, archived, batchRow, student, admin, examRow }
  }

  const marks = (over: Partial<Record<string, number>> = {}) => ({
    aksharaShuddhi: 45,
    swaraShuddhi: 27,
    niyantranaAnargalata: 18,
    shraavyata: 4,
    pratishakyaGrammar: 4,
    ...over,
  })

  it('stores the marks and derived outcome, completes the exam, and grades every published chapter of the track', async () => {
    const seed = await seedTrackWithChapters()
    world = seed.w

    const result = await recordExamResult(
      { db: seed.w.schoolDb },
      seed.examRow.id,
      seed.admin.id,
      { ...marks(), notes: 'clear pronunciation' },
    )

    expect(result.status).toBe('completed')
    expect(result.result).toMatchObject({
      total: 98,
      childrenBonus: 0,
      outcome: 'prathamaSreni',
      level: 'level4',
      notes: 'clear pronunciation',
      evaluatorId: seed.admin.id,
    })

    const evaluations = await seed.w.schoolDb.query.evaluation.findMany({
      where: (t, { eq: eqCol }) => eqCol(t.studentId, seed.student.id),
    })
    // The two published chapters — not the draft, not the archived one.
    expect(evaluations.map(e => e.chapterId).sort()).toEqual(seed.chapters.map(c => c.id).sort())
    expect(evaluations.every(e => e.level === 'level4' && e.batchId === seed.batchRow.id)).toBe(true)
  })

  it("adds the children's bonus from the year of birth, taken from the sitting's own year", async () => {
    // Sitting is in June 2026: born 2014 is 12, so +5.
    const seed = await seedTrackWithChapters(2014)
    world = seed.w

    const result = await recordExamResult({ db: seed.w.schoolDb }, seed.examRow.id, seed.admin.id, marks())

    expect(result.result?.childrenBonus).toBe(5)
    expect(result.result?.total).toBe(103)
    expect(result.result?.outcome).toBe('prathamaSreni')
  })

  it("an Athi Uttamam total is stored as L4 with the higher distinction", async () => {
    // 98 + 10 (born 2018, age 8) = 108.
    const seed = await seedTrackWithChapters(2018)
    world = seed.w

    const result = await recordExamResult({ db: seed.w.schoolDb }, seed.examRow.id, seed.admin.id, marks())

    expect(result.result).toMatchObject({ total: 108, outcome: 'athiUttamam', level: 'level4' })
  })

  it('can lower a chapter grade: the result is the latest word on the whole track', async () => {
    const seed = await seedTrackWithChapters()
    world = seed.w
    await createEvaluation(seed.w, {
      student: seed.student,
      chapter: seed.chapters[0]!,
      evaluator: seed.admin,
      level: 'level3',
    })

    // 20 + 15 + 10 + 2 + 2 = 49: a fail — which must leave the L3 alone …
    await recordExamResult(
      { db: seed.w.schoolDb },
      seed.examRow.id,
      seed.admin.id,
      marks({ aksharaShuddhi: 20, swaraShuddhi: 15, niyantranaAnargalata: 10, shraavyata: 2, pratishakyaGrammar: 2 }),
    )
    const afterFail = await seed.w.schoolDb.query.evaluation.findMany({
      where: (t, { eq: eqCol }) => eqCol(t.studentId, seed.student.id),
    })
    expect(afterFail.map(e => e.level)).toEqual(['level3'])

    // … while a later, lower pass (L1) is written over it.
    const second = await createExam(seed.w, {
      student: seed.student,
      track: seed.trackRow,
      batch: seed.batchRow,
      scheduledAt: new Date('2026-09-01T10:00:00Z'),
    })
    await recordExamResult(
      { db: seed.w.schoolDb },
      second.id,
      seed.admin.id,
      marks({ aksharaShuddhi: 36, swaraShuddhi: 18, niyantranaAnargalata: 8, shraavyata: 2, pratishakyaGrammar: 1 }),
    )
    const latest = await seed.w.schoolDb.query.evaluation.findMany({
      where: (t, { and: andCols, eq: eqCol }) =>
        andCols(eqCol(t.studentId, seed.student.id), eqCol(t.chapterId, seed.chapters[0]!.id)),
      orderBy: (t, { desc }) => desc(t.evaluatedAt),
    })
    expect(latest[0]?.level).toBe('level1')
  })

  it('a reappear completes the exam and stores the marks but writes no evaluations', async () => {
    const seed = await seedTrackWithChapters()
    world = seed.w

    const result = await recordExamResult(
      { db: seed.w.schoolDb },
      seed.examRow.id,
      seed.admin.id,
      marks({ aksharaShuddhi: 20, swaraShuddhi: 15, niyantranaAnargalata: 10, shraavyata: 2, pratishakyaGrammar: 2 }),
    )

    expect(result.status).toBe('completed')
    expect(result.result).toMatchObject({ outcome: 'reappear', level: null, total: 49 })
    const evaluations = await seed.w.schoolDb.query.evaluation.findMany()
    expect(evaluations).toHaveLength(0)
  })

  it("refuses to grade a student with no year of birth on file, and changes nothing", async () => {
    const seed = await seedTrackWithChapters(null)
    world = seed.w

    await expect(
      recordExamResult({ db: seed.w.schoolDb }, seed.examRow.id, seed.admin.id, marks()),
    ).rejects.toMatchObject({ statusCode: 422 })

    const stored = await findById(seed.w.schoolDb, seed.examRow.id)
    expect(stored?.status).toBe('scheduled')
    expect(await seed.w.schoolDb.query.examResult.findMany()).toHaveLength(0)
  })

  it('a second result for the same exam is a 409, and does not add a second set of evaluations', async () => {
    const seed = await seedTrackWithChapters()
    world = seed.w
    await recordExamResult({ db: seed.w.schoolDb }, seed.examRow.id, seed.admin.id, marks())

    await expect(
      recordExamResult({ db: seed.w.schoolDb }, seed.examRow.id, seed.admin.id, marks()),
    ).rejects.toMatchObject({ statusCode: 409 })

    expect(await seed.w.schoolDb.query.evaluation.findMany()).toHaveLength(2)
  })
})

describe('examResult constraints', () => {
  it('rejects a total that is not the sum of its parts', async () => {
    const seed = await seedScheduledExam()
    world = seed.world

    await expect(
      seed.world.schoolDb.insert(examResult).values({
        examId: seed.examRow.id,
        aksharaShuddhi: 40,
        swaraShuddhi: 20,
        niyantranaAnargalata: 10,
        shraavyata: 0,
        pratishakyaGrammar: 0,
        childrenBonus: 0,
        total: 99,
        outcome: 'prathamaSreni',
        evaluatorId: seed.evaluatorAProfile.id,
      }),
    ).rejects.toThrow()
  })

  it('rejects a mark above its maximum', async () => {
    const seed = await seedScheduledExam()
    world = seed.world

    await expect(
      seed.world.schoolDb.insert(examResult).values({
        examId: seed.examRow.id,
        aksharaShuddhi: 51,
        swaraShuddhi: 0,
        niyantranaAnargalata: 0,
        shraavyata: 0,
        pratishakyaGrammar: 0,
        childrenBonus: 0,
        total: 51,
        outcome: 'reappear',
        evaluatorId: seed.evaluatorAProfile.id,
      }),
    ).rejects.toThrow()
  })
})

describe('ExamWithDetail projection (real gap: GET /exams list + detail, addendum §0.4)', () => {
  it('findMany eager-loads the track and result detail, not just the bare exam row', async () => {
    const seed = await seedScheduledExam()
    world = seed.world

    const { items } = await findMany(
      world.schoolDb,
      { limit: 20, status: undefined, cursor: undefined, mine: false },
      { kind: 'all' },
      await defaultCourseId(world),
    )

    const found = items.find(item => item.id === seed.examRow.id)
    expect(found?.track).toEqual({ id: seed.trackRow.id, name: seed.trackRow.name })
    expect(found?.result).toBeNull()

    // Complete it with a result, then confirm the eager-loaded result reflects it — including the
    // derived `level`, which isn't a stored column.
    await createExamResult(world, { exam: seed.examRow, evaluator: seed.evaluatorAProfile, notes: 'good progress' })

    const { items: itemsAfter } = await findMany(
      world.schoolDb,
      { limit: 20, status: undefined, cursor: undefined, mine: false },
      { kind: 'all' },
      await defaultCourseId(world),
    )
    const foundAfter = itemsAfter.find(item => item.id === seed.examRow.id)
    expect(foundAfter?.result).toMatchObject({
      examId: seed.examRow.id,
      total: 98,
      outcome: 'prathamaSreni',
      level: 'level4',
      notes: 'good progress',
    })
  })

  it("findMany's 'own' scope still returns the detail projection, not just visibility-filtered bare rows", async () => {
    world = await createTestSchool()
    const trackRow = await createTrack(world)
    const batchRow = await createBatch(world, trackRow)
    const me = await createProfile(world)
    const someoneElse = await createProfile(world)
    const myExam = await createExam(world, { student: me, track: trackRow, batch: batchRow })
    await createExam(world, { student: someoneElse, track: trackRow, batch: batchRow })

    const { items } = await findMany(
      world.schoolDb,
      { limit: 20, status: undefined, cursor: undefined, mine: false },
      { kind: 'own', profileId: me.id },
      await defaultCourseId(world),
    )

    expect(items.map(i => i.id)).toEqual([myExam.id])
    expect(items[0]?.track.id).toBe(trackRow.id)
  })

  it("findMany's 'manageable' scope includes both the actor's own exams and their students', all with detail", async () => {
    world = await createTestSchool()
    const trackRow = await createTrack(world)
    const instructorProfile = await createProfile(world)
    const studentProfile = await createProfile(world)
    const batchRow = await createBatch(world, trackRow)
    await enroll(world, instructorProfile, batchRow, 'instructor')
    await enroll(world, studentProfile, batchRow, 'student')
    const studentExam = await createExam(world, { student: studentProfile, track: trackRow, batch: batchRow })

    const { items } = await findMany(
      world.schoolDb,
      { limit: 20, status: undefined, cursor: undefined, mine: false },
      { kind: 'manageable', profileId: instructorProfile.id, batchIds: [batchRow.id] },
      await defaultCourseId(world),
    )

    const found = items.find(i => i.id === studentExam.id)
    expect(found?.track.id).toBe(trackRow.id)
  })

  it('findByIdWithDetail returns the same track/result projection as the list (list-detail equivalence, §11.3/DD-004)', async () => {
    world = await createTestSchool()
    const trackRow = await createTrack(world)
    const batchRow = await createBatch(world, trackRow)
    const studentProfile = await createProfile(world)
    const examRow = await createExam(world, { student: studentProfile, track: trackRow, batch: batchRow })

    const detail = await findByIdWithDetail(world.schoolDb, examRow.id)

    expect(detail?.id).toBe(examRow.id)
    expect(detail?.track).toEqual({ id: trackRow.id, name: trackRow.name })
    expect(detail?.result).toBeNull()
  })

  it('findByIdWithDetail returns undefined for a nonexistent exam, same as the bare findById', async () => {
    world = await createTestSchool()

    await expect(findByIdWithDetail(world.schoolDb, crypto.randomUUID())).resolves.toBeUndefined()
    await expect(findById(world.schoolDb, crypto.randomUUID())).resolves.toBeUndefined()
  })
})

describe('findResultsForStudent (a track certification is the student\'s latest result there)', () => {
  it("returns every result across every track for this student, newest first, each with its derived level", async () => {
    world = await createTestSchool()
    const trackA = await createTrack(world)
    const trackB = await createTrack(world)
    const batchA = await createBatch(world, trackA)
    const batchB = await createBatch(world, trackB)
    const student = await createProfile(world, { name: 'Student' })
    const evaluator = await createProfile(world, { name: 'Evaluator' })
    const examA = await createExam(world, { student, track: trackA, batch: batchA, status: 'completed' })
    const examB = await createExam(world, { student, track: trackB, batch: batchB, status: 'completed' })
    await createExamResult(world, { exam: examA, evaluator, evaluatedAt: new Date('2026-01-01T00:00:00Z') })
    await createExamResult(world, {
      exam: examB,
      evaluator,
      marks: { aksharaShuddhi: 35, swaraShuddhi: 20, niyantranaAnargalata: 10, shraavyata: 0, pratishakyaGrammar: 0 },
      evaluatedAt: new Date('2026-02-01T00:00:00Z'),
    })

    const results = await findResultsForStudent(world.schoolDb, student.id, await defaultCourseId(world))

    expect(results.map(r => r.trackId)).toEqual([trackB.id, trackA.id])
    expect(results.map(r => r.level)).toEqual(['level1', 'level4'])
  })

  it("never returns another student's results", async () => {
    world = await createTestSchool()
    const trackRow = await createTrack(world)
    const batchRow = await createBatch(world, trackRow)
    const student = await createProfile(world)
    const otherStudent = await createProfile(world)
    const evaluator = await createProfile(world)
    const theirs = await createExam(world, { student: otherStudent, track: trackRow, batch: batchRow, status: 'completed' })
    await createExamResult(world, { exam: theirs, evaluator })

    await expect(findResultsForStudent(world.schoolDb, student.id, await defaultCourseId(world))).resolves.toEqual([])
  })

  it('returns an empty array, not an error, when the student has no results at all', async () => {
    world = await createTestSchool()
    const student = await createProfile(world)

    await expect(findResultsForStudent(world.schoolDb, student.id, await defaultCourseId(world))).resolves.toEqual([])
  })

  it('a re-sit on the same track keeps both results — history, not a single current row', async () => {
    world = await createTestSchool()
    const trackRow = await createTrack(world)
    const batchRow = await createBatch(world, trackRow)
    const student = await createProfile(world)
    const evaluator = await createProfile(world)
    const first = await createExam(world, { student, track: trackRow, batch: batchRow, status: 'completed' })
    const second = await createExam(world, { student, track: trackRow, batch: batchRow, status: 'completed' })
    await createExamResult(world, { exam: first, evaluator })
    await createExamResult(world, { exam: second, evaluator })

    await expect(findResultsForStudent(world.schoolDb, student.id, await defaultCourseId(world))).resolves.toHaveLength(2)
  })
})
