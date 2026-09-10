import '@narada/env/load'
import { inArray } from 'drizzle-orm'
import { defineCommand, runMain } from 'citty'

import { chapter, evaluation, exam, getScopedDatabase, shutdownPools, trackCertification } from '@narada/db'
import { requireSchool } from './school-helpers'

/**
 * One-off data-migration for a school imported before `trackCertification` existed: moves each
 * "TRACK N CERTIFICATION..." chapter's evaluations into a real `trackCertification` row (keyed on
 * the track, not a fake chapter), preserving each evaluation's original `evaluatedAt`, then
 * deletes the fake chapters. `tools/src/parse-excel-to-json.ts` already stopped generating these
 * for a *fresh* import — this is the counterpart for a school imported before that fix, where
 * re-running the importer isn't an option (it mints new random ids for every row every run, so a
 * second import pass would duplicate all 10k+ evaluations rather than update anything in place).
 *
 * Dry-run by default; pass --commit to actually write.
 */
const CERTIFICATION_TITLE_PATTERN = /TRACK\s*\d+\s*CERTIFICATION/i

const backfillCmd = defineCommand({
  meta: {
    description:
      'Move a school\'s fake "TRACK N CERTIFICATION" chapters into real trackCertification rows.',
  },
  args: {
    slug: { type: 'string', required: true, description: 'School org slug to backfill.' },
    commit: {
      type: 'boolean',
      default: false,
      description: 'Actually write to the database. Without this flag, only reports what would happen.',
    },
  },
  async run({ args }) {
    try {
      const school = await requireSchool(args.slug)
      const db = getScopedDatabase(school.id)

      const certificationChapters = await db.query.chapter.findMany({
        where: (t, { ilike }) => ilike(t.title, '%certification%'),
      })
      const matched = certificationChapters.filter(c => CERTIFICATION_TITLE_PATTERN.test(c.title))

      if (matched.length === 0) {
        console.log(`No "TRACK N CERTIFICATION" chapters found for "${school.slug}" — nothing to do.`)
        return
      }

      console.log(`Found ${matched.length} certification chapter(s) in "${school.slug}":`)
      for (const c of matched) console.log(`  - ${c.code} "${c.title}" (track ${c.trackId})`)

      const chapterIds = matched.map(c => c.id)
      const evaluationsToMove = await db.query.evaluation.findMany({
        where: (t, { inArray: inArrayCol }) => inArrayCol(t.chapterId, chapterIds),
      })
      const examsOnThoseChapters = await db.query.exam.findMany({
        where: (t, { inArray: inArrayCol }) => inArrayCol(t.chapterId, chapterIds),
      })

      console.log(
        `${evaluationsToMove.length} evaluation(s) will become trackCertification rows; ` +
          `${examsOnThoseChapters.length} exam row(s) reference these chapters and would block deletion.`,
      )

      if (examsOnThoseChapters.length > 0) {
        throw new Error(
          `${examsOnThoseChapters.length} exam row(s) reference a certification chapter — resolve ` +
            'those manually before backfilling (this script deliberately does not touch exams).',
        )
      }

      if (!args.commit) {
        console.log('Dry run only — pass --commit to write. No rows were changed.')
        return
      }

      const chapterById = new Map(matched.map(c => [c.id, c]))

      await db.transaction(async tx => {
        if (evaluationsToMove.length > 0) {
          await tx.insert(trackCertification).values(
            evaluationsToMove.map(e => ({
              id: e.id, // stable across re-runs of this script, and traceable back to its source evaluation
              trackId: chapterById.get(e.chapterId)!.trackId,
              studentId: e.studentId,
              level: e.level,
              notes: e.notes,
              evaluatorId: e.evaluatorId,
              evaluatedAt: e.evaluatedAt ?? undefined,
            })),
          )
        }

        await tx.delete(evaluation).where(inArray(evaluation.chapterId, chapterIds))
        await tx.delete(chapter).where(inArray(chapter.id, chapterIds))
      })

      console.log(
        `✅ Backfilled ${evaluationsToMove.length} trackCertification row(s) and removed ` +
          `${matched.length} fake certification chapter(s) from "${school.slug}".`,
      )
    } finally {
      await shutdownPools()
    }
  },
})

runMain(backfillCmd)
