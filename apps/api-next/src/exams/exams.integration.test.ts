import { afterEach, describe, expect, it } from 'vitest'

import { withTwoConnections, type TxConnection } from '../testing/concurrency'
import { destroyTestWorld } from '../testing/cleanup'
import {
  createChapter,
  createExam,
  createProfile,
  createTestSchool,
  createTrack,
  type ExamRow,
  type TestWorld,
} from '../testing/fixtures'

let world: TestWorld | undefined

afterEach(async () => {
  if (world) {
    await destroyTestWorld(world)
    world = undefined
  }
})

/**
 * These two SQL statements are hand-copied from `src/exams/repository.ts` (`insertEvaluation` and
 * `complete`) and from `src/exams/service.ts` (`recordExamResult`'s transaction shape), because
 * the barrier helper (`withTwoConnections`) drives two raw `pg` connections directly rather than
 * two `SchoolDbClient`s — `getSchoolDb` caches one pool per organization, so there is no way to
 * get two *distinct* backend connections/PIDs through it. If `repository.ts`'s guarded predicates
 * ever change, these literals must be updated to match.
 */
const INSERT_EVALUATION_SQL = `
  INSERT INTO evaluation (id, "studentId", "chapterId", level, notes, "evaluatorId")
  VALUES ($1, $2, $3, $4, $5, $6)
`
// Guard matches H3's fixed repository.complete: evaluationId IS NULL AND status = <expected>
// (the status read before the transaction opened) — not just evaluationId IS NULL.
const COMPLETE_GUARDED_SQL = `
  UPDATE exam
  SET "evaluationId" = $1, "performedAt" = now(), status = 'completed'
  WHERE id = $2 AND "evaluationId" IS NULL AND status = $3
`
const CANCEL_GUARDED_SQL = `
  UPDATE exam
  SET status = 'cancelled'
  WHERE id = $1 AND status = $2
`

async function seedScheduledExam() {
  const w = await createTestSchool()
  const trackRow = await createTrack(w)
  const chapterRow = await createChapter(w, trackRow, { status: 'published' })
  const studentProfile = await createProfile(w, { name: 'Student' })
  const evaluatorAProfile = await createProfile(w, { name: 'Evaluator A' })
  const evaluatorBProfile = await createProfile(w, { name: 'Evaluator B' })
  const examRow = await createExam(w, {
    student: studentProfile,
    chapter: chapterRow,
    status: 'scheduled',
  })

  return { world: w, examRow, studentProfile, evaluatorAProfile, evaluatorBProfile, chapterRow }
}

/** Runs the evaluation-insert + guarded-complete sequence and returns whether it won. */
async function attemptRecordResult(
  conn: TxConnection,
  examId: string,
  studentId: string,
  chapterId: string,
  evaluatorId: string,
  expectedStatus: string,
): Promise<{ won: boolean }> {
  const evaluationId = crypto.randomUUID()
  await conn.query(INSERT_EVALUATION_SQL, [
    evaluationId,
    studentId,
    chapterId,
    'level1',
    null,
    evaluatorId,
  ])
  const result = await conn.query(COMPLETE_GUARDED_SQL, [evaluationId, examId, expectedStatus])
  return { won: (result.rowCount ?? 0) === 1 }
}

describe('exam result concurrency (matrix item 2: two simultaneous results)', () => {
  it('exactly one evaluation persists, the exam completes exactly once, and the loser is rolled back (a real 0-row guarded update)', async () => {
    const seed = await seedScheduledExam()
    world = seed.world

    let winner: 'a' | 'b' | undefined
    let aRowCount: number | undefined
    let bRowCount: number | undefined

    await withTwoConnections(seed.world.schemaName, async (connA, connB) => {
      await connA.begin()
      await connB.begin()

      const evaluationIdA = crypto.randomUUID()
      const evaluationIdB = crypto.randomUUID()

      // Each evaluation insert targets a distinct row, so neither blocks the other.
      await connA.query(INSERT_EVALUATION_SQL, [
        evaluationIdA,
        seed.studentProfile.id,
        seed.chapterRow.id,
        'level1',
        null,
        seed.evaluatorAProfile.id,
      ])
      await connB.query(INSERT_EVALUATION_SQL, [
        evaluationIdB,
        seed.studentProfile.id,
        seed.chapterRow.id,
        'level2',
        null,
        seed.evaluatorBProfile.id,
      ])

      // Both attempt the guarded UPDATE on the same exam row "concurrently" — issued without
      // awaiting, so whichever the Postgres server actually admits first resolves quickly, and the
      // other is genuinely blocked on that row's lock until the winner's transaction ends.
      const updateA = connA.query(COMPLETE_GUARDED_SQL, [evaluationIdA, seed.examRow.id, 'scheduled'])
      const updateB = connB.query(COMPLETE_GUARDED_SQL, [evaluationIdB, seed.examRow.id, 'scheduled'])

      const first = await Promise.race([
        updateA.then(result => ({ who: 'a' as const, result })),
        updateB.then(result => ({ who: 'b' as const, result })),
      ])

      winner = first.who
      if (winner === 'a') {
        aRowCount = first.result.rowCount ?? 0
        expect(aRowCount).toBe(1)
        // Committing the winner releases the row lock, letting B's blocked UPDATE proceed.
        await connA.commit()
        const resultB = await updateB
        bRowCount = resultB.rowCount ?? 0
        expect(bRowCount).toBe(0)
        // Mirrors recordExamResult's transaction: a 0-row guarded update throws, rolling back the
        // whole transaction — including the loser's evaluation insert.
        await connB.rollback()
      } else {
        bRowCount = first.result.rowCount ?? 0
        expect(bRowCount).toBe(1)
        await connB.commit()
        const resultA = await updateA
        aRowCount = resultA.rowCount ?? 0
        expect(aRowCount).toBe(0)
        await connA.rollback()
      }
    })

    expect(winner).toBeDefined()
    expect([aRowCount, bRowCount].filter(count => count === 1)).toHaveLength(1)
    expect([aRowCount, bRowCount].filter(count => count === 0)).toHaveLength(1)

    const evaluations = await seed.world.schoolDb.query.evaluation.findMany({
      where: (t, { eq }) => eq(t.studentId, seed.studentProfile.id),
    })
    expect(evaluations).toHaveLength(1)

    const finalExam = await seed.world.schoolDb.query.exam.findFirst({
      where: (t, { eq }) => eq(t.id, seed.examRow.id),
    })
    expect(finalExam?.status).toBe('completed')
    expect(finalExam?.evaluationId).toBe(evaluations[0]?.id)
  })
})

describe('exam result vs. cancellation race (matrix item 1, both orders) — H3 applied', () => {
  it(
    'order 1 (cancellation commits first, then result): the result now loses — ' +
      "repository.complete's guard (post-H3) checks both evaluationId IS NULL AND " +
      "status = <the status B read before its transaction>, so B's guard fails once A's " +
      'cancellation has committed, and B\'s evaluation insert rolls back with it.',
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
        // committed) — this is exactly the expectedStatus recordExamResult would have captured
        // from its own pre-transaction read.
        const { won } = await attemptRecordResult(
          connB,
          seed.examRow.id,
          seed.studentProfile.id,
          seed.chapterRow.id,
          seed.evaluatorAProfile.id,
          'scheduled',
        )
        expect(won).toBe(false)
        // A losing guarded update means recordExamResult's transaction throws and rolls back —
        // mirror that here by rolling back B instead of committing.
        await connB.rollback()
      })

      const finalExam = await seed.world.schoolDb.query.exam.findFirst({
        where: (t, { eq }) => eq(t.id, seed.examRow.id),
      })
      // Post-H3 behavior: the cancellation stands, no result was ever recorded.
      expect(finalExam?.status).toBe('cancelled')
      expect(finalExam?.evaluationId).toBeNull()

      const evaluations = await seed.world.schoolDb.query.evaluation.findMany({
        where: (t, { eq }) => eq(t.studentId, seed.studentProfile.id),
      })
      expect(evaluations).toHaveLength(0)
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
          seed.studentProfile.id,
          seed.chapterRow.id,
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
        where: (t, { eq }) => eq(t.id, seed.examRow.id),
      })
      expect(finalExam?.status).toBe('completed')
    },
  )
})
