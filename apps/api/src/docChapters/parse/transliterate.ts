/**
 * Reduces a verse's text, in whichever of the three scripts it's written, to a coarse Latin
 * "skeleton" — good enough to score cross-script similarity against, never meant to be a
 * linguistically exact transliteration (retroflex/dental consonants collapse to the same letter,
 * schwa deletion is approximated, etc.). Telugu is mapped to Devanagari by codepoint offset first
 * (the two blocks mirror each other letter-for-letter), then run through the same Devanagari
 * table; English/IAST just has its diacritics folded down to the same base letters the Devanagari
 * table produces, so all three land in one comparable alphabet.
 */

const CONSONANTS: Record<string, string> = {
  'क': 'k', 'ख': 'kh', 'ग': 'g', 'घ': 'gh', 'ङ': 'ng',
  'च': 'c', 'छ': 'ch', 'ज': 'j', 'झ': 'jh', 'ञ': 'ny',
  'ट': 't', 'ठ': 'th', 'ड': 'd', 'ढ': 'dh', 'ण': 'n',
  'त': 't', 'थ': 'th', 'द': 'd', 'ध': 'dh', 'न': 'n',
  'प': 'p', 'फ': 'ph', 'ब': 'b', 'भ': 'bh', 'म': 'm',
  'य': 'y', 'र': 'r', 'ल': 'l', 'व': 'v',
  'श': 'sh', 'ष': 'sh', 'स': 's', 'ह': 'h',
  'ळ': 'l', 'क़': 'k', 'ख़': 'kh', 'ग़': 'g', 'ज़': 'j', 'ड़': 'd', 'ढ़': 'dh', 'फ़': 'ph', 'य़': 'y',
}

const INDEPENDENT_VOWELS: Record<string, string> = {
  'अ': 'a', 'आ': 'aa', 'इ': 'i', 'ई': 'ii', 'उ': 'u', 'ऊ': 'uu',
  'ऋ': 'r', 'ॠ': 'r', 'ऌ': 'l', 'ॡ': 'l',
  'ए': 'e', 'ऐ': 'ai', 'ओ': 'o', 'औ': 'au', 'ॲ': 'a', 'ऑ': 'o',
}

const MATRAS: Record<string, string> = {
  'ा': 'aa', 'ि': 'i', 'ी': 'ii', 'ु': 'u', 'ू': 'uu',
  'ृ': 'r', 'ॄ': 'r', 'ॢ': 'l', 'ॣ': 'l',
  'े': 'e', 'ै': 'ai', 'ो': 'o', 'ौ': 'au', 'ॅ': 'a', 'ॉ': 'o',
}

// `ॐ` (U+0950) is its own single codepoint, not decomposable via the consonant/vowel/matra tables
// above — unlike Telugu's/English's own way of writing "om" (అం / oṃ), which already decomposes to
// the same "om" skeleton through the ordinary vowel+anusvara path.
const MISC: Record<string, string> = { 'ं': 'm', 'ः': 'h', 'ँ': 'm', 'ऽ': '', 'ॐ': 'om' }

const VIRAMA = '्'

const DEVANAGARI_BLOCK_START = 0x0900
const TELUGU_BLOCK_START = 0x0c00
const TELUGU_BLOCK_END = 0x0c7f

function teluguToDevanagariCodepoints(text: string): string {
  return [...text]
    .map(ch => {
      const code = ch.codePointAt(0) ?? 0
      if (code >= TELUGU_BLOCK_START && code <= TELUGU_BLOCK_END) {
        return String.fromCodePoint(code - TELUGU_BLOCK_START + DEVANAGARI_BLOCK_START)
      }
      return ch
    })
    .join('')
}

function transliterateDevanagari(text: string): string {
  const chars = [...text]
  let out = ''
  for (let i = 0; i < chars.length; i++) {
    const ch = chars[i]!
    const next = chars[i + 1]
    if (ch in CONSONANTS) {
      out += CONSONANTS[ch]
      if (next === VIRAMA) {
        i++ // suppress the inherent "a" — the cluster continues with no vowel of its own
      } else if (next !== undefined && next in MATRAS) {
        out += MATRAS[next]
        i++
      } else {
        out += 'a'
      }
      continue
    }
    if (ch in INDEPENDENT_VOWELS) {
      out += INDEPENDENT_VOWELS[ch]
      continue
    }
    if (ch in MISC) {
      out += MISC[ch]
      continue
    }
    if (ch in MATRAS) {
      out += MATRAS[ch] // a stray matra with no preceding consonant — shouldn't happen, handled anyway
    }
    // punctuation, digits, danda, latin letters, whitespace: contribute nothing to the skeleton
  }
  return out
}

// Longest diacritic sequences first (e.g. `ḹ` before a hypothetical bare `ḹ`-adjacent match) —
// order only matters if a shorter pattern could accidentally consume part of a longer one, which
// none of these do, but keeping length-descending is a cheap safety habit.
const IAST_REPLACEMENTS: [string, string][] = [
  ['ā', 'aa'], ['ī', 'ii'], ['ū', 'uu'],
  ['ṝ', 'r'], ['ṛ', 'r'], ['ḹ', 'l'], ['ḷ', 'l'],
  ['ṁ', 'm'], ['ṃ', 'm'], ['ṅ', 'ng'], ['ñ', 'ny'],
  ['ṇ', 'n'], ['ṭ', 't'], ['ḍ', 'd'],
  ['ś', 'sh'], ['ṣ', 'sh'], ['ḥ', 'h'],
]

function transliterateIAST(text: string): string {
  let out = text.toLowerCase()
  for (const [from, to] of IAST_REPLACEMENTS) {
    out = out.split(from).join(to)
  }
  return out.replace(/[^a-z]/g, '')
}

export type Script = 'sa' | 'te' | 'en'

/** The coarse Latin skeleton for one verse's text, in whichever script it's written. */
export function transliterateToSkeleton(text: string, script: Script): string {
  if (script === 'en') return transliterateIAST(text)
  const devanagari = script === 'te' ? teluguToDevanagariCodepoints(text) : text
  return transliterateDevanagari(devanagari)
}
