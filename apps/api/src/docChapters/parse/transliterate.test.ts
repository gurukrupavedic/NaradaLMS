import { describe, expect, it } from 'vitest'

import { transliterateToSkeleton } from './transliterate'

describe('transliterateToSkeleton', () => {
  it('produces the same skeleton for the same line in all three scripts', () => {
    const sa = transliterateToSkeleton('ॐ सह नाववतु', 'sa')
    const te = transliterateToSkeleton('ఓం సహ నావవతు', 'te')
    const en = transliterateToSkeleton('oṃ saha nāv avatu', 'en')
    expect(sa).toBe('omsahanaavavatu')
    expect(te).toBe(sa)
    expect(en).toBe(sa)
  })

  it('suppresses the inherent vowel before a virama', () => {
    // गुरुर्ब्रह्मा — "guru" + र् (virama, no vowel) + "brahmaa", not "gurura brahmaa"
    expect(transliterateToSkeleton('गुरुर्ब्रह्मा', 'sa')).toBe('gururbrahmaa')
  })

  it('applies a dependent vowel sign instead of the default "a"', () => {
    // गु + रु + ः — each consonant takes its own "u" matra rather than the default "a", then the
    // trailing visarga becomes "h".
    expect(transliterateToSkeleton('गुरुः', 'sa')).toBe('guruh')
  })

  it('ignores danda and whitespace, which carry no skeleton content', () => {
    expect(transliterateToSkeleton('राम । श्याम ॥', 'sa')).toBe(transliterateToSkeleton('राम श्याम', 'sa'))
  })

  it('folds IAST diacritics and punctuation to the same base alphabet', () => {
    expect(transliterateToSkeleton('Śāntiḥ, śāntiḥ!', 'en')).toBe('shaantihshaantih')
  })

  it('maps Telugu to Devanagari by codepoint offset before transliterating', () => {
    // विष्णु — vi-sh-nu — and its Telugu equivalent విష్ణు should land on the same skeleton.
    expect(transliterateToSkeleton('విష్ణు', 'te')).toBe(transliterateToSkeleton('विष्णु', 'sa'))
  })

  it('returns an empty skeleton for text with no letters at all', () => {
    expect(transliterateToSkeleton('॥ १ ॥', 'sa')).toBe('')
    expect(transliterateToSkeleton('(1)', 'en')).toBe('')
  })
})
