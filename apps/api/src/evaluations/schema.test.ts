import { describe, expect, it, vi } from 'vitest'

import { CreateEvaluationSchema } from './schema'

// Explicit factory (rather than the real module) so importing `./schema` doesn't pull in
// `@narada/db` at import time and trigger real env-var validation — never loads.
vi.mock('@narada/db', () => ({
  proficiencyLevel: {
    enumValues: ['absent', 'notStarted', 'practicing', 'level1', 'level2', 'level3', 'level4'],
  },
}))

const studentId = crypto.randomUUID()
const chapterId = crypto.randomUUID()

describe('CreateEvaluationSchema', () => {
  it.each(['absent', 'level1', 'level2', 'level3'] as const)(
    'accepts a teacher-gradable level (%s)',
    level => {
      const result = CreateEvaluationSchema.safeParse({ studentId, chapterId, level })
      expect(result.success).toBe(true)
    },
  )

  it('rejects level4 — that grade only comes from an exam evaluation', () => {
    const result = CreateEvaluationSchema.safeParse({ studentId, chapterId, level: 'level4' })
    expect(result.success).toBe(false)
  })
})
