import { describe, expect, it } from 'vitest'
import * as fs from 'fs'
import * as path from 'path'

import { parseDocSet } from './index'

/**
 * Validates the whole pipeline (parse → section → classify → verse-join → transliterate → align)
 * against the actual source documents this feature is built for, not just synthetic fixtures.
 * `seed-data/*.docx` are real, gitignored files (school records, not something that belongs in
 * git) — present on a machine that's done chapter-import work locally, absent everywhere else
 * (a fresh clone, CI). This suite skips itself entirely when they're missing rather than failing;
 * the synthetic-fixture tests in the sibling `*.test.ts` files are what CI actually runs.
 */
const SEED_DATA_DIR = path.join(__dirname, '../../../../../seed-data')
const SEED_FILES = {
  sa: path.join(SEED_DATA_DIR, 'sanskrit.docx'),
  te: path.join(SEED_DATA_DIR, 'telugu.docx'),
  en: path.join(SEED_DATA_DIR, 'english.docx'),
}
const hasSeedData = Object.values(SEED_FILES).every(f => fs.existsSync(f))

describe.skipIf(!hasSeedData)('parseDocSet — against the real seed-data documents', () => {
  it('parses all 109 headings with plausible, mostly-clean cross-script alignment', async () => {
    const buffers = {
      sa: fs.readFileSync(SEED_FILES.sa),
      te: fs.readFileSync(SEED_FILES.te),
      en: fs.readFileSync(SEED_FILES.en),
    }

    const headings = await parseDocSet(buffers)

    // Confirmed by direct inspection of the source documents (grepping their raw XML for
    // w:pStyle values): exactly 109 Heading2 paragraphs in each of the three docs.
    expect(headings).toHaveLength(109)
    expect(headings.every(h => h.title.sa.length > 0)).toBe(true)
    expect(headings.every(h => h.title.te.length > 0)).toBe(true)
    expect(headings.every(h => h.title.en.length > 0)).toBe(true)
    expect(headings.every(h => h.track.length > 0)).toBe(true)

    const totalVerses = headings.reduce((sum, h) => sum + h.verses.length, 0)
    expect(totalVerses).toBeGreaterThan(1500) // 2200+ at last measurement — a floor, not the exact count

    // The Vishnu Sahasranama heading — long, well-known, and a real course-chapter split target
    // (VSN 1/2/3) — should align very cleanly across all three scripts; this is the strongest
    // available signal that transliteration + alignment are behaving on real content, not just the
    // synthetic examples in the other test files.
    const vsn = headings.find(h => h.title.sa.includes('विष्णु सहस्र नाम'))
    expect(vsn).toBeDefined()
    expect(vsn!.verses.length).toBeGreaterThan(150)
    const vsnFullyAligned = vsn!.verses.filter(v => v.te !== null && v.en !== null).length
    expect(vsnFullyAligned / vsn!.verses.length).toBeGreaterThan(0.95)

    // Every verse has real sa text (sa is canonical — never a gap on its own side) and never both
    // te and en text loaded with the identical string, which would indicate a script mix-up.
    for (const heading of headings) {
      for (const verse of heading.verses) {
        expect(verse.sa.length).toBeGreaterThan(0)
        if (verse.te !== null && verse.en !== null) expect(verse.te).not.toBe(verse.en)
      }
    }
  }, 30_000)
})
