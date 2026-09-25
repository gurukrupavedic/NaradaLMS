import { describe, expect, it, vi } from 'vitest'

import { FindExamsSchema, RecordExamResultSchema, UpdateExamSchema } from './schema'

// Explicit factory (rather than the real module) so importing `./schema` doesn't pull in
// `@narada/db` at import time and trigger real env-var validation — never loads.
vi.mock('@narada/db', () => ({
  examStatus: { enumValues: ['scheduled', 'inProgress', 'completed', 'cancelled'] },
  examOutcome: {
    enumValues: ['reappear', 'level1', 'level2', 'dwitiyaSreni', 'prathamaSreni', 'athiUttamam'],
  },
  proficiencyLevel: {
    enumValues: [
      'absent',
      'notStarted',
      'practicing',
      'level0',
      'level1',
      'level2',
      'level3',
      'level4',
    ],
  },
  chapterStatus: { enumValues: ['draft', 'published'] },
  script: { enumValues: ['te', 'sa', 'en'] },
  // Pulled in transitively via `./schema`'s `ProfileSchema`/`BatchSchema` imports for
  // `ExamWithDetailSchema`'s `student`/`batch` fields.
  batchStatus: { enumValues: ['upcoming', 'active', 'completed'] },
  enrollmentRole: { enumValues: ['instructor', 'ta', 'student'] },
  enrollmentStatus: { enumValues: ['active', 'break', 'dropped', 'inactive'] },
}))

describe('RecordExamResultSchema', () => {
  const full = {
    aksharaShuddhi: 50,
    swaraShuddhi: 30,
    niyantranaAnargalata: 20,
    shraavyata: 5,
    pratishakyaGrammar: 5,
  }

  it('accepts a full sheet at every maximum, and zeros', () => {
    expect(RecordExamResultSchema.safeParse(full).success).toBe(true)
    expect(
      RecordExamResultSchema.safeParse({
        aksharaShuddhi: 0,
        swaraShuddhi: 0,
        niyantranaAnargalata: 0,
        shraavyata: 0,
        pratishakyaGrammar: 0,
      }).success,
    ).toBe(true)
  })

  it('accepts an optional note', () => {
    expect(
      RecordExamResultSchema.safeParse({ ...full, notes: 'clear pronunciation' }).success,
    ).toBe(true)
  })

  it.each([
    ['aksharaShuddhi', 51],
    ['swaraShuddhi', 31],
    ['niyantranaAnargalata', 21],
    ['shraavyata', 6],
    ['pratishakyaGrammar', 6],
  ] as const)('rejects %s above its maximum (%i)', (mark, value) => {
    expect(RecordExamResultSchema.safeParse({ ...full, [mark]: value }).success).toBe(false)
  })

  it.each([
    'aksharaShuddhi',
    'swaraShuddhi',
    'niyantranaAnargalata',
    'shraavyata',
    'pratishakyaGrammar',
  ] as const)('rejects a negative %s', mark => {
    expect(RecordExamResultSchema.safeParse({ ...full, [mark]: -1 }).success).toBe(false)
  })

  it('rejects half marks — whole marks only', () => {
    expect(RecordExamResultSchema.safeParse({ ...full, aksharaShuddhi: 44.5 }).success).toBe(false)
  })

  it.each([
    'aksharaShuddhi',
    'swaraShuddhi',
    'niyantranaAnargalata',
    'shraavyata',
    'pratishakyaGrammar',
  ] as const)('requires %s', mark => {
    const { [mark]: _omitted, ...rest } = full
    expect(RecordExamResultSchema.safeParse(rest).success).toBe(false)
  })

  it('strips a client-supplied bonus, total, outcome or level — the server derives those', () => {
    const result = RecordExamResultSchema.safeParse({
      ...full,
      childrenBonus: 10,
      total: 999,
      outcome: 'athiUttamam',
      level: 'level4',
    })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data).not.toHaveProperty('childrenBonus')
      expect(result.data).not.toHaveProperty('total')
      expect(result.data).not.toHaveProperty('outcome')
      expect(result.data).not.toHaveProperty('level')
    }
  })
})

describe('FindExamsSchema', () => {
  it('parses graded=false to boolean false — z.stringbool(), unlike z.coerce.boolean(), handles this correctly', () => {
    const result = FindExamsSchema.safeParse({ graded: 'false' })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.graded).toBe(false)
    }
  })

  it('parses graded=true to boolean true', () => {
    const result = FindExamsSchema.safeParse({ graded: 'true' })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.graded).toBe(true)
    }
  })

  it('leaves graded undefined when omitted', () => {
    const result = FindExamsSchema.safeParse({})
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.graded).toBeUndefined()
    }
  })
})

describe('UpdateExamSchema', () => {
  it('rejects an offset-free scheduledAt', () => {
    const result = UpdateExamSchema.safeParse({ scheduledAt: '2024-01-01T00:00:00' })
    expect(result.success).toBe(false)
  })

  it('accepts a Z-suffixed scheduledAt', () => {
    const result = UpdateExamSchema.safeParse({ scheduledAt: '2024-01-01T00:00:00Z' })
    expect(result.success).toBe(true)
  })
})

