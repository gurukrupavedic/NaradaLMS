import { describe, expect, it } from 'vitest'

import { classifyParagraph } from './classify'

describe('classifyParagraph', () => {
  it('keeps a Devanagari chant line', () => {
    expect(classifyParagraph('ॐ शुक्लांबरधरं विष्णुं शशिवर्णं चतुर्भुजम् ॥')).toBe('chant')
  })

  it('keeps a Telugu chant line', () => {
    expect(classifyParagraph('ఓం శుక్లాంబరధరం విష్ణుం')).toBe('chant')
  })

  it('keeps an IAST chant line with diacritics', () => {
    expect(classifyParagraph('oṃ śuklāmbaradharaṃ viṣṇuṃ śaśivarṇaṃ caturbhujam')).toBe('chant')
  })

  it('misclassifies a diacritic-free IAST line as an annotation (a documented limitation, not a fix target)', () => {
    // Rare in practice — real chant text almost always carries at least one long vowel or
    // retroflex consonant — but a line that happens to need none at all is indistinguishable from
    // a genuine English aside by the pure-ASCII heuristic alone. The cleanup review is the
    // backstop for exactly this kind of edge case.
    expect(classifyParagraph('rama rama rama')).toBe('annotation')
  })

  it('drops a danda-prefixed English aside', () => {
    expect(classifyParagraph('।At Wakeup')).toBe('annotation')
    expect(classifyParagraph('॥SHLOKA GAYATRI')).toBe('annotation')
  })

  it('does not drop a lettered chant segment label (danda comes after the letter, not before)', () => {
    expect(classifyParagraph('A।शक्ति सहित गणपतिम्')).toBe('chant')
  })

  it('drops a URL', () => {
    expect(classifyParagraph('https://www.youtube.com/watch?v=VHDaOIZPjf8')).toBe('annotation')
  })

  it('drops a timestamp reference', () => {
    expect(classifyParagraph('कराग्रे वसते लक्ष्मी (01:32)')).toBe('annotation')
  })

  it('drops an empty paragraph', () => {
    expect(classifyParagraph('   ')).toBe('annotation')
  })
})
