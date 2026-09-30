import type { DocxParagraph } from './docx'

/** One `Heading2` from the source document — a doc chapter's raw material, before verse-joining or classification. */
export type DocSection = {
  track: string
  title: string
  paragraphs: string[]
}

/**
 * Groups a flat paragraph stream into sections by heading, matching the source documents'
 * confirmed structure: `Title` (front matter — "Foundational"/"Advanced" — carries no chant text
 * of its own) → `Heading1` ("TRACK n") → `Heading2` (one doc chapter's title), with unstyled body
 * paragraphs belonging to whichever `Heading2` most recently opened.
 *
 * A body paragraph seen before any `Heading2` (front matter under `Title`, or between `Title` and
 * the first `Heading1`/`Heading2`) has nowhere to go and is dropped — there is no section yet to
 * hold it.
 */
export function sectionParagraphs(paragraphs: DocxParagraph[]): DocSection[] {
  const sections: DocSection[] = []
  let track = ''
  let current: DocSection | null = null

  for (const p of paragraphs) {
    if (p.style === 'Title') {
      current = null
      continue
    }
    if (p.style === 'Heading1') {
      track = p.text
      current = null
      continue
    }
    if (p.style === 'Heading2') {
      current = { track, title: p.text, paragraphs: [] }
      sections.push(current)
      continue
    }
    if (current && p.text.length > 0) {
      current.paragraphs.push(p.text)
    }
  }

  return sections
}
