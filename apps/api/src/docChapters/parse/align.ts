import { transliterateToSkeleton, type Script } from './transliterate'

function levenshteinDistance(a: string, b: string): number {
  if (a.length === 0) return b.length
  if (b.length === 0) return a.length

  let previousRow = Array.from({ length: a.length + 1 }, (_, i) => i)
  for (let j = 1; j <= b.length; j++) {
    const currentRow = [j]
    for (let i = 1; i <= a.length; i++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1
      currentRow.push(Math.min(previousRow[i]! + 1, currentRow[i - 1]! + 1, previousRow[i - 1]! + cost))
    }
    previousRow = currentRow
  }
  return previousRow[a.length]!
}

// Comfortably below the real 0.8 "keep it" threshold (see ALIGNMENT_MIN_THRESHOLD below) — a
// margin of safety so this can never prune a pair the alignment would actually have accepted, only
// ones already far outside consideration.
const PRUNE_BELOW = 0.5

/** 1 = identical, 0 = nothing in common — a plain, swappable pure function. Two empty strings count as identical (there's nothing to disagree on). */
export function similarity(a: string, b: string): number {
  if (a.length === 0 && b.length === 0) return 1
  const maxLength = Math.max(a.length, b.length)
  // Levenshtein distance is never smaller than the two strings' length difference, so this cheap
  // bound is always >= the true similarity — skip the O(len(a)*len(b)) computation whenever even
  // that best case already falls below anything the alignment would keep. Aligning a full section
  // means scoring every verse in one script against every verse in the other (not just true
  // matches), so this matters: most of those pairs are unrelated verses this prunes for free.
  if (1 - Math.abs(a.length - b.length) / maxLength < PRUNE_BELOW) return 0
  const distance = levenshteinDistance(a, b)
  return 1 - distance / maxLength
}

type AlignedIndexPair = { aIndex: number | null; bIndex: number | null }

/**
 * Order-preserving sequence alignment between two verse-skeleton lists — never a plain
 * position-by-position zip, since one script can have a verse the other doesn't (an insertion,
 * a deletion, a repeated refrain). Classic Needleman-Wunsch shape: the best cumulative similarity
 * aligning `a[0..i)` with `b[0..j)` is the best of (match `a[i-1]` with `b[j-1]` and add their
 * similarity), (skip `a[i-1]`), or (skip `b[j-1]`) — skipping costs nothing, so the algorithm only
 * ever matches a pair when doing so doesn't come at the expense of better matches elsewhere in the
 * sequence, and both sequences stay in their own original relative order throughout.
 */
function alignSkeletons(a: string[], b: string[]): AlignedIndexPair[] {
  const n = a.length
  const m = b.length
  const score: number[][] = Array.from({ length: n + 1 }, () => new Array<number>(m + 1).fill(0))
  const BACK_DIAG = 0
  const BACK_UP = 1
  const BACK_LEFT = 2
  const back: number[][] = Array.from({ length: n + 1 }, () => new Array<number>(m + 1).fill(BACK_DIAG))

  for (let i = 1; i <= n; i++) back[i]![0] = BACK_UP
  for (let j = 1; j <= m; j++) back[0]![j] = BACK_LEFT

  // A translation preserves verse order, so a correct match for `a[i]` sits at roughly
  // `j = i * m/n` in `b`, never far off it — an occasional inserted/deleted verse is the only
  // thing that drifts a match away from the exact diagonal, and never by much. Restricting which
  // cells actually run the expensive `similarity()` call (still filling in every other cell as an
  // ordinary skip) turns the O(n·m) cost of a long section's alignment into O(n·band), without
  // changing the result for any realistic amount of drift.
  const band = Math.max(20, Math.abs(n - m) + 15)

  for (let i = 1; i <= n; i++) {
    const center = m === 0 ? 0 : Math.round((i * m) / n)
    for (let j = 1; j <= m; j++) {
      const inBand = Math.abs(j - center) <= band
      const matchScore = inBand ? score[i - 1]![j - 1]! + similarity(a[i - 1]!, b[j - 1]!) : -Infinity
      const skipA = score[i - 1]![j]!
      const skipB = score[i]![j - 1]!
      if (matchScore >= skipA && matchScore >= skipB) {
        score[i]![j] = matchScore
        back[i]![j] = BACK_DIAG
      } else if (skipA >= skipB) {
        score[i]![j] = skipA
        back[i]![j] = BACK_UP
      } else {
        score[i]![j] = skipB
        back[i]![j] = BACK_LEFT
      }
    }
  }

  const pairs: AlignedIndexPair[] = []
  let i = n
  let j = m
  while (i > 0 || j > 0) {
    const direction = i > 0 && j > 0 ? back[i]![j]! : i > 0 ? BACK_UP : BACK_LEFT
    if (direction === BACK_DIAG) {
      pairs.push({ aIndex: i - 1, bIndex: j - 1 })
      i--
      j--
    } else if (direction === BACK_UP) {
      pairs.push({ aIndex: i - 1, bIndex: null })
      i--
    } else {
      pairs.push({ aIndex: null, bIndex: j - 1 })
      j--
    }
  }
  pairs.reverse()
  return pairs
}

export type AlignedVerseText = { text: string; confidence: number } | null

/**
 * Aligns `other`'s verses against `canonical`'s (the master/sa script's own order and count never
 * change — this never guesses by position, only by content), scored in three bands: `>= 0.95`
 * clean, `0.80–0.95` kept but worth a look, `< 0.80` not confident enough to keep at all (`null`
 * for that verse — a gap for the cleanup review to fill by hand, never a guess).
 */
export function alignToCanonical(
  canonical: string[],
  other: string[],
  otherScript: Script,
  canonicalScript: Script = 'sa',
): AlignedVerseText[] {
  const canonicalSkeletons = canonical.map(text => transliterateToSkeleton(text, canonicalScript))
  const otherSkeletons = other.map(text => transliterateToSkeleton(text, otherScript))
  const pairs = alignSkeletons(canonicalSkeletons, otherSkeletons)

  const result: AlignedVerseText[] = new Array(canonical.length).fill(null)
  for (const { aIndex, bIndex } of pairs) {
    if (aIndex === null || bIndex === null) continue
    const confidence = similarity(canonicalSkeletons[aIndex]!, otherSkeletons[bIndex]!)
    result[aIndex] = confidence >= 0.8 ? { text: other[bIndex]!, confidence } : null
  }
  return result
}

export const ALIGNMENT_CLEAN_THRESHOLD = 0.95
export const ALIGNMENT_MIN_THRESHOLD = 0.8
