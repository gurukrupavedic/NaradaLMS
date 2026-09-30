import { parseDocxParagraphs } from './docx'
import { sectionParagraphs, type DocSection } from './sections'
import { classifyParagraph } from './classify'
import { joinVerses } from './verses'
import { alignToCanonical, ALIGNMENT_CLEAN_THRESHOLD } from './align'
import type { Script } from './transliterate'

export type { DocSection } from './sections'
export type { VerseCandidate } from './verses'
export { ALIGNMENT_CLEAN_THRESHOLD, ALIGNMENT_MIN_THRESHOLD, similarity } from './align'
export { classifyParagraph } from './classify'
export { parseDocxParagraphs, type DocxParagraph } from './docx'
export { sectionParagraphs }
export { joinVerses } from './verses'
export { transliterateToSkeleton } from './transliterate'

/** One heading's chant text, canonical (sa) order, each verse's confidently-aligned text per script. */
export type ParsedHeading = {
  title: string
  track: string
  verses: {
    sa: string
    te: string | null
    en: string | null
    /** `true` if either script's alignment landed below the clean threshold — a hint, not a gate. */
    flaggedForReview: boolean
  }[]
}

function chantVerseTexts(section: DocSection): string[] {
  const chantParagraphs = section.paragraphs.filter(p => classifyParagraph(p) === 'chant')
  return joinVerses(chantParagraphs).map(v => v.text)
}

/** Heading titles are matched positionally in doc order between docx exports of the same underlying document set — the docs are always parsed together, section-for-section, never matched by title text across scripts (a title is itself just another aligned-and-translated string, not a stable key). */
function assertSameSectionCount(counts: Record<Script, number>): void {
  if (counts.sa !== counts.te || counts.sa !== counts.en) {
    throw new Error(
      `the three source documents have a different number of Heading2 sections (sa=${counts.sa}, te=${counts.te}, en=${counts.en}) — they must be exports of the same document set`,
    )
  }
}

/**
 * Parses and aligns a full set of source documents (Sanskrit, Telugu, English/IAST — the same
 * chant text in parallel scripts) into one entry per heading, each with its verses aligned across
 * all three scripts by content. Never a DB or HTTP concern — this is the pure half of the import
 * pipeline; turning the result into `docChapter`/`segment`/`segmentText` rows is the caller's job.
 */
export async function parseDocSet(buffers: { sa: Buffer; te: Buffer; en: Buffer }): Promise<ParsedHeading[]> {
  const [saParagraphs, teParagraphs, enParagraphs] = await Promise.all([
    parseDocxParagraphs(buffers.sa),
    parseDocxParagraphs(buffers.te),
    parseDocxParagraphs(buffers.en),
  ])

  const saSections = sectionParagraphs(saParagraphs)
  const teSections = sectionParagraphs(teParagraphs)
  const enSections = sectionParagraphs(enParagraphs)
  assertSameSectionCount({ sa: saSections.length, te: teSections.length, en: enSections.length })

  return saSections.map((saSection, i) => {
    const saVerses = chantVerseTexts(saSection)
    const teVerses = chantVerseTexts(teSections[i]!)
    const enVerses = chantVerseTexts(enSections[i]!)

    const teAligned = alignToCanonical(saVerses, teVerses, 'te')
    const enAligned = alignToCanonical(saVerses, enVerses, 'en')

    return {
      title: saSection.title,
      track: saSection.track,
      verses: saVerses.map((sa, verseIndex) => {
        const te = teAligned[verseIndex]
        const en = enAligned[verseIndex]
        const flaggedForReview =
          (te !== null && te.confidence < ALIGNMENT_CLEAN_THRESHOLD) ||
          (en !== null && en.confidence < ALIGNMENT_CLEAN_THRESHOLD) ||
          te === null ||
          en === null
        return { sa, te: te?.text ?? null, en: en?.text ?? null, flaggedForReview }
      }),
    }
  })
}
