import { describe, expect, it } from 'vitest'

import { alignToCanonical, similarity } from './align'

describe('similarity', () => {
  it('is 1 for identical strings', () => {
    expect(similarity('sahanaavavatu', 'sahanaavavatu')).toBe(1)
  })

  it('is 1 for two empty strings', () => {
    expect(similarity('', '')).toBe(1)
  })

  it('is 0 for totally unrelated strings of unequal length', () => {
    expect(similarity('a', 'zzzzzzzzzz')).toBe(0)
  })

  it('scores a near-miss high but not perfect', () => {
    const score = similarity('sahanaavavatu', 'sahanaavavat')
    expect(score).toBeGreaterThan(0.9)
    expect(score).toBeLessThan(1)
  })
})

describe('alignToCanonical', () => {
  it('matches verses 1:1 in order when both sides agree', () => {
    const sa = ['sahanaavavatu', 'sahanaubhunaktu', 'sahaviiryamkaravaavahai']
    const other = ['sahanaavavatu', 'sahanaubhunaktu', 'sahaviiryamkaravaavahai']
    const aligned = alignToCanonical(sa, other, 'en', 'en')
    expect(aligned.map(a => a?.text)).toEqual(other)
    aligned.forEach(a => expect(a?.confidence).toBe(1))
  })

  it('leaves a gap (never a guess) where the other script has nothing close', () => {
    const sa = ['omsahanaavavatu', 'sahanaubhunaktu']
    const other = ['omsahanaavavatu'] // second sa verse has no counterpart at all
    const aligned = alignToCanonical(sa, other, 'en', 'en')
    expect(aligned[0]?.text).toBe('omsahanaavavatu')
    expect(aligned[1]).toBeNull()
  })

  it('keeps sa verses in their own order even when the other script has an extra verse inserted', () => {
    const sa = ['verseone', 'versetwo', 'versethree']
    const other = ['verseone', 'insertedextra', 'versetwo', 'versethree']
    const aligned = alignToCanonical(sa, other, 'en', 'en')
    expect(aligned.map(a => a?.text)).toEqual(['verseone', 'versetwo', 'versethree'])
  })

  it('does not misalign a repeated refrain out of order', () => {
    const sa = ['refrain', 'versea', 'refrain', 'verseb']
    const other = ['refrain', 'versea', 'refrain', 'verseb']
    const aligned = alignToCanonical(sa, other, 'en', 'en')
    // Each occurrence of "refrain" should map to the occurrence in its own position, not both to
    // the first one — i.e. the alignment is order-preserving, not a "find the best global match".
    expect(aligned.map(a => a?.text)).toEqual(sa)
  })
})
