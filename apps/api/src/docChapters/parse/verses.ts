/**
 * A trailing "verse-close marker": some run of dandas/pipes/periods and an optional verse number,
 * at the very end of a paragraph. The source documents are not consistent about which punctuation
 * marks a verse's end — confirmed against the real files, different sections of the same document
 * use `||1`/`|| 3` (doubled ASCII pipes), a bare `॥` (the single-codepoint Devanagari *double*
 * danda — already a strong closer on its own, unlike the single danda `।`, which is a half-verse
 * caesura, never a boundary), or `..6..` (doubled periods sandwiching the number). What they share
 * is always *doubling* a mark (or using the already-doubled `॥`) — a single trailing `.`/`|`/`।` is
 * ordinary punctuation or a half-verse break, not a boundary, so it's specifically the doubling
 * that this looks for rather than treating any one of these characters as inherently special.
 */
const TRAILING_MARKER_RUN = /[.|।॥\d\s]+$/
const STRONG_CLOSER = '॥'
const WEAK_CLOSERS = /[|.।]/g

function closingMarkerLength(text: string): number {
  const run = text.match(TRAILING_MARKER_RUN)?.[0]
  if (!run) return 0
  const hasStrongCloser = run.includes(STRONG_CLOSER)
  const weakCloserCount = (run.match(WEAK_CLOSERS) ?? []).length
  return hasStrongCloser || weakCloserCount >= 2 ? run.length : 0
}

/** A verse number as its own leading token ("1.\t…", "12) …") — a format the design doc noted without it appearing in the specific documents parsed so far; kept as a recognized, stripped prefix regardless. */
const LEADING_NUMBER_MARKER = /^\d{1,3}\s*[.)]\s*/

/**
 * A lettered-segment label ("A।", "B।", …) — confirmed against the real source docs on a
 * "nottuswaram" (a form set in named melodic segments rather than numbered verses), which
 * otherwise never closes a segment with a doubled marker at all (its own internal punctuation is a
 * single pipe or an ellipsis). Seeing a new label is itself a boundary: whatever was accumulating
 * flushes *before* this paragraph starts, even though nothing marked the previous one as closed.
 */
const LABELED_SEGMENT_START = /^[A-Za-z]\s*[।॥]/

export type VerseCandidate = { text: string }

/**
 * Joins a section's (already classified-as-chant) paragraphs into verses. A paragraph that ends
 * with a close marker is a complete verse on its own; one that doesn't is a half-verse (or a
 * fragment split across more than two paragraphs) that accumulates until a later paragraph does
 * close it — matching the source docs' own mix of "one full verse per paragraph" and "one
 * half-verse per paragraph" formatting. Whatever is left un-closed at the end of a section is still
 * emitted as a final verse rather than dropped.
 */
export function joinVerses(paragraphs: string[]): VerseCandidate[] {
  const verses: VerseCandidate[] = []
  let buffer: string[] = []

  const flush = () => {
    if (buffer.length === 0) return
    verses.push({ text: buffer.join(' ').trim() })
    buffer = []
  }

  for (const raw of paragraphs) {
    if (LABELED_SEGMENT_START.test(raw)) flush()
    const withoutLeadingMarker = raw.replace(LEADING_NUMBER_MARKER, '')
    const markerLength = closingMarkerLength(withoutLeadingMarker)
    const text = (
      markerLength > 0 ? withoutLeadingMarker.slice(0, withoutLeadingMarker.length - markerLength) : withoutLeadingMarker
    ).trim()
    if (text.length > 0) buffer.push(text)
    if (markerLength > 0) flush()
  }
  flush()

  return verses
}
