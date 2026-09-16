import { describe, expect, it, vi } from 'vitest'

import { CreateExamSchema, RecordExamResultSchema, UpdateExamSchema } from './schema'

// Explicit factory (rather than the real module) so importing `./schema` doesn't pull in
// `@narada/db` at import time and trigger real env-var validation — never loads.
vi.mock('@narada/db', () => ({
  examStatus: { enumValues: ['scheduled', 'inProgress', 'completed', 'cancelled'] },
  proficiencyLevel: {
    enumValues: ['absent', 'notStarted', 'practicing', 'level1', 'level2', 'level3', 'level4'],
  },
  chapterStatus: { enumValues: ['draft', 'published'] },
  script: { enumValues: ['te', 'sa', 'en'] },
}))

const studentId = crypto.randomUUID()
const chapterId = crypto.randomUUID()

describe('CreateExamSchema', () => {
  it('accepts a valid Z-suffixed scheduledAt and produces a Date', () => {
    const result = CreateExamSchema.safeParse({
      studentId,
      chapterId,
      scheduledAt: '2024-01-01T00:00:00Z',
    })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.scheduledAt).toBeInstanceOf(Date)
    }
  })

  it('rejects a date-only scheduledAt', () => {
    const result = CreateExamSchema.safeParse({
      studentId,
      chapterId,
      scheduledAt: '2024-01-01',
    })
    expect(result.success).toBe(false)
  })

  it('rejects a raw epoch number for scheduledAt', () => {
    const result = CreateExamSchema.safeParse({
      studentId,
      chapterId,
      scheduledAt: 1704067200000,
    })
    expect(result.success).toBe(false)
  })
})

describe('RecordExamResultSchema', () => {
  it('accepts level4 — the only outcome an exam can certify', () => {
    const result = RecordExamResultSchema.safeParse({ level: 'level4' })
    expect(result.success).toBe(true)
  })

  it.each(['absent', 'level1', 'level2', 'level3'] as const)(
    'rejects %s — that grade belongs to a teacher evaluation, not an exam result',
    level => {
      const result = RecordExamResultSchema.safeParse({ level })
      expect(result.success).toBe(false)
    },
  )
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
