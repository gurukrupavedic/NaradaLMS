// A paragraph that opens with a danda immediately followed by a Latin letter — this document set's
// own editorial convention for a sub-heading aside ("।At Wakeup", "।SHLOKA GAYATRI"), confirmed
// against the real source docs.
const DANDA_LATIN_PREFIX = /^[।॥]\s*[A-Za-z]/

const URL_PATTERN = /https?:\/\//i
const TIMESTAMP_PATTERN = /\(\s*\d{1,2}:\d{2}\s*\)/

// Any character outside printable ASCII — a real chant line always carries either a Devanagari/
// Telugu codepoint or, in the English/IAST doc, a diacritic (ā, ṣ, ṇ, ṃ, …). Plain ASCII text is
// reliably an English aside or instruction, in *any* of the three source documents.
const HAS_NON_ASCII = /[^\x00-\x7F]/

/**
 * Chant-vs-annotation, deliberately conservative: default to keeping a paragraph, discard only on
 * one of a few strong, specific signals. Getting this exactly right isn't the point — a
 * misclassified line either shows up as an obviously-wrong extra segment (kept when it should be
 * dropped) in the cleanup review, where it has an explicit delete action, or is silently missing
 * (dropped when it should be kept), which is the one failure mode worth being conservative against.
 */
export function classifyParagraph(text: string): 'chant' | 'annotation' {
  const trimmed = text.trim()
  if (trimmed.length === 0) return 'annotation'
  if (DANDA_LATIN_PREFIX.test(trimmed)) return 'annotation'
  if (URL_PATTERN.test(trimmed)) return 'annotation'
  if (TIMESTAMP_PATTERN.test(trimmed)) return 'annotation'
  if (!HAS_NON_ASCII.test(trimmed)) return 'annotation'
  return 'chant'
}
