import { describe, expect, it } from 'vitest'

import { allowedTransitions, assertValidTransition, type ExamStatus } from './transitions'

const statuses = Object.keys(allowedTransitions) as ExamStatus[]

const cases = statuses.flatMap(from =>
  statuses.map(to => ({ from, to, allowed: allowedTransitions[from].includes(to) })),
)

describe('assertValidTransition', () => {
  it.each(cases)('$from -> $to is allowed=$allowed', ({ from, to, allowed }) => {
    if (allowed) {
      expect(() => assertValidTransition(from, to)).not.toThrow()
    } else {
      expect(() => assertValidTransition(from, to)).toThrow()
    }
  })
})
