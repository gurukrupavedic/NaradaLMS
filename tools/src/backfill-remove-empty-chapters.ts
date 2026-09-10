import '@narada/env/load'
import { inArray } from 'drizzle-orm'
import { defineCommand, runMain } from 'citty'

import { chapter, getScopedDatabase, shutdownPools } from '@narada/db'
import { requireSchool } from './school-helpers'

/**
 * One-off data-migration for a school imported before `tools/src/parse-excel-to-json.ts` learned
 * to skip blank-header spreadsheet columns: SheetJS names a column with no header text "__EMPTY",
 * "__EMPTY_1", etc, and 31 such trailing columns in the real assessment sheet (right after "TRACK
 * 8 CERTIFICATION EXAM STATUS", verified blank for every one of 889 rows) got imported as 31 fake
 * published chapters. Deletes them outright — refuses if anything actually references one, rather
 * than assuming "still zero" holds for every school this ever runs against.
 *
 * Dry-run by default; pass --commit to actually write.
 */
const BLANK_HEADER_CHAPTER_PATTERN = /^__EMPTY(_\d+)?$/

const backfillCmd = defineCommand({
  meta: {
    description: 'Delete a school\'s fake "__EMPTY..." chapters (blank spreadsheet header columns).',
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

      const allChapters = await db.query.chapter.findMany()
      const matched = allChapters.filter(c => BLANK_HEADER_CHAPTER_PATTERN.test(c.title))

      if (matched.length === 0) {
        console.log(`No "__EMPTY..." chapters found for "${school.slug}" — nothing to do.`)
        return
      }

      console.log(`Found ${matched.length} blank-header chapter(s) in "${school.slug}":`)
      for (const c of matched) console.log(`  - ${c.code} "${c.title}" (track ${c.trackId})`)

      const chapterIds = matched.map(c => c.id)
      const evaluationsOnThem = await db.query.evaluation.findMany({
        where: (t, { inArray: inArrayCol }) => inArrayCol(t.chapterId, chapterIds),
      })
      const examsOnThem = await db.query.exam.findMany({
        where: (t, { inArray: inArrayCol }) => inArrayCol(t.chapterId, chapterIds),
      })

      if (evaluationsOnThem.length > 0 || examsOnThem.length > 0) {
        throw new Error(
          `${evaluationsOnThem.length} evaluation(s) and ${examsOnThem.length} exam(s) reference ` +
            'a "__EMPTY..." chapter — resolve those manually before deleting (this script only ' +
            'handles the expected case of zero real references).',
        )
      }

      console.log('0 evaluations and 0 exams reference these chapters — safe to delete outright.')

      if (!args.commit) {
        console.log('Dry run only — pass --commit to write. No rows were changed.')
        return
      }

      await db.delete(chapter).where(inArray(chapter.id, chapterIds))

      console.log(`✅ Deleted ${matched.length} blank-header chapter(s) from "${school.slug}".`)
    } finally {
      await shutdownPools()
    }
  },
})

runMain(backfillCmd)
