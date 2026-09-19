import { describe, expect, it } from 'vitest'

import { resolveSelection } from './course-selection'

const vedam = { slug: 'vedam', name: 'Vedam' }
const smartam = { slug: 'smartam', name: 'Smartam' }

describe('resolveSelection', () => {
  it('has nothing to select when there is nothing to pick from', () => {
    expect(resolveSelection([], null)).toEqual({ kind: 'none' })
    expect(resolveSelection([], 'vedam')).toEqual({ kind: 'none' })
  })

  it('uses the only course without asking, whatever was stored', () => {
    expect(resolveSelection([vedam], null)).toEqual({ kind: 'use', slug: 'vedam' })
    expect(resolveSelection([vedam], 'smartam')).toEqual({ kind: 'use', slug: 'vedam' })
  })

  it('keeps a stored pick that is still on offer', () => {
    expect(resolveSelection([vedam, smartam], 'smartam')).toEqual({ kind: 'use', slug: 'smartam' })
  })

  it('compares the stored pick case-insensitively, and returns the course’s own slug', () => {
    expect(resolveSelection([vedam, smartam], 'SMARTAM')).toEqual({ kind: 'use', slug: 'smartam' })
  })

  it('asks when there are several and nothing valid is stored', () => {
    expect(resolveSelection([vedam, smartam], null)).toEqual({
      kind: 'choose',
      options: [vedam, smartam],
    })
  })

  it('does not stay pinned to a course that is no longer on offer', () => {
    expect(resolveSelection([vedam, smartam], 'gone')).toEqual({
      kind: 'choose',
      options: [vedam, smartam],
    })
    expect(resolveSelection([smartam], 'vedam')).toEqual({ kind: 'use', slug: 'smartam' })
  })
})
