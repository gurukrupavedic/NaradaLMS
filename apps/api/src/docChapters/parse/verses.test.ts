import { describe, expect, it } from 'vitest'

import { joinVerses } from './verses'

describe('joinVerses', () => {
  it('keeps one already-complete paragraph as one verse, stripping the trailing marker', () => {
    expect(joinVerses(['शुक्लांबरधरं विष्णुं ॥ 1'])).toEqual([{ text: 'शुक्लांबरधरं विष्णुं' }])
  })

  it('joins a half-verse paragraph with the one that closes it', () => {
    const verses = joinVerses(['गुरुर्ब्रह्मा गुरुर्विष्णुः', 'गुरुर्देवो महेश्वरः ॥ 2'])
    expect(verses).toEqual([{ text: 'गुरुर्ब्रह्मा गुरुर्विष्णुः गुरुर्देवो महेश्वरः' }])
  })

  it('recognizes a bare double-danda close with no number', () => {
    expect(joinVerses(['यो देव स्सविता ॥'])).toEqual([{ text: 'यो देव स्सविता' }])
  })

  it('recognizes doubled-ASCII-pipe closes, with or without a space before the number', () => {
    expect(joinVerses(['line one||1', 'line two || 2'])).toEqual([{ text: 'line one' }, { text: 'line two' }])
  })

  it('recognizes doubled-period closes with the number sandwiched between them', () => {
    expect(joinVerses(['first verse ..1..', 'second verse ..2..'])).toEqual([
      { text: 'first verse' },
      { text: 'second verse' },
    ])
  })

  it('does not close on a single trailing danda or pipe (a half-verse caesura, not a boundary)', () => {
    expect(joinVerses(['first half।', 'second half ॥'])).toEqual([{ text: 'first half। second half' }])
  })

  it('strips a leading numbered-list marker', () => {
    expect(joinVerses(['1.\tfirst verse ॥', '2. second verse ॥'])).toEqual([
      { text: 'first verse' },
      { text: 'second verse' },
    ])
  })

  it('flushes on a lettered segment label even without a preceding close marker', () => {
    const verses = joinVerses(['A।first segment text', 'more of segment A', 'B।second segment text'])
    expect(verses).toEqual([{ text: 'A।first segment text more of segment A' }, { text: 'B।second segment text' }])
  })

  it('emits whatever is left un-closed at the end rather than dropping it', () => {
    expect(joinVerses(['closed verse ॥ 1', 'trailing half-verse with no close'])).toEqual([
      { text: 'closed verse' },
      { text: 'trailing half-verse with no close' },
    ])
  })

  it('returns nothing for an empty input', () => {
    expect(joinVerses([])).toEqual([])
  })
})
