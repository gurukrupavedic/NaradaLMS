import { describe, expect, it } from 'vitest'

import { pluralize } from './pluralize'

describe('pluralize', () => {
  it('uses the singular for exactly one', () => {
    expect(pluralize(1, 'track')).toBe('1 track')
  })

  it('uses the plural for zero and for many', () => {
    expect(pluralize(0, 'track')).toBe('0 tracks')
    expect(pluralize(2, 'track')).toBe('2 tracks')
  })

  it('honours an irregular plural', () => {
    expect(pluralize(1, 'batch', 'batches')).toBe('1 batch')
    expect(pluralize(3, 'batch', 'batches')).toBe('3 batches')
  })
})
