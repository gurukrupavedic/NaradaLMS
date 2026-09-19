import { describe, expect, it } from 'vitest'

import { rootDestination } from './course-destination'

const vedam = { slug: 'vedam', name: 'Vedam' }
const smartam = { slug: 'smartam', name: 'Smartam' }

describe('rootDestination', () => {
  it('has nowhere to go for someone in no course', () => {
    expect(rootDestination([])).toEqual({ kind: 'none' })
  })

  it('goes straight into an only course, without asking', () => {
    expect(rootDestination([vedam])).toEqual({ kind: 'go', slug: 'vedam' })
  })

  it('asks someone in several', () => {
    expect(rootDestination([smartam, vedam])).toEqual({ kind: 'choose', options: [smartam, vedam] })
  })
})
