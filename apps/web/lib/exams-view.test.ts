import { describe, expect, it } from 'vitest'

import type { ProficiencyLevel } from '@/lib/proficiency'
import type { ApiExam, ApiTrack } from '@/lib/types'

import {
  buildCertificationRecord,
  groupExams,
  isCertified,
  summarizeCertifications,
  type CertificationRow,
} from './exams-view'

function track(order: number, chapters: Array<{ id: string; code: string; title: string }>) {
  return { id: `t${order}`, order, name: `Track ${order}`, chapters } as unknown as ApiTrack
}

function certChapter(order: number) {
  return {
    id: `cert-${order}`,
    code: `${order}.99`,
    title: `TRACK ${order} CERTIFICATION EXAM STATUS`,
  }
}

function row(overrides: Partial<CertificationRow>): CertificationRow {
  return {
    trackId: 't1',
    trackOrder: 1,
    track: 'Track 1',
    chapterId: 'cert-1',
    chapterCode: '1.99',
    level: null,
    evaluatedAt: null,
    ...overrides,
  }
}

describe('buildCertificationRecord', () => {
  it('lists one row per track that has a certification chapter, in track order', () => {
    const rows = buildCertificationRecord(
      [
        track(2, [certChapter(2)]),
        track(1, [{ id: 'a', code: '1.1', title: 'Ganapathi' }, certChapter(1)]),
      ],
      new Map(),
    )

    expect(rows.map(r => r.trackOrder)).toEqual([1, 2])
  })

  it('skips tracks with no certification chapter', () => {
    const rows = buildCertificationRecord(
      [track(9, []), track(1, [certChapter(1)])],
      new Map(),
    )

    expect(rows.map(r => r.trackOrder)).toEqual([1])
  })

  // Track 8's certification sits at 8.12 of 43 chapters, so it cannot be found by position.
  it('finds the certification chapter even when it is not the last one', () => {
    const rows = buildCertificationRecord(
      [track(8, [certChapter(8), { id: 'later', code: '8.40', title: 'Later chapter' }])],
      new Map(),
    )

    expect(rows[0].chapterId).toBe('cert-8')
  })

  it('attaches the student mark when one exists, and leaves it null otherwise', () => {
    const rows = buildCertificationRecord(
      [track(1, [certChapter(1)]), track(2, [certChapter(2)])],
      new Map([['cert-1', { level: 'level3' as ProficiencyLevel, evaluatedAt: 'Aug 22, 2026' }]]),
    )

    expect(rows[0].level).toBe('level3')
    expect(rows[0].evaluatedAt).toBe('Aug 22, 2026')
    expect(rows[1].level).toBeNull()
  })
})

describe('isCertified', () => {
  it('counts any real mark as certified', () => {
    expect(isCertified(row({ level: 'level2' }))).toBe(true)
    expect(isCertified(row({ level: 'level4' }))).toBe(true)
  })

  it('does not count an untouched or absent certification', () => {
    expect(isCertified(row({ level: null }))).toBe(false)
    expect(isCertified(row({ level: 'absent' }))).toBe(false)
    expect(isCertified(row({ level: 'notStarted' }))).toBe(false)
  })
})

describe('summarizeCertifications', () => {
  it('counts certified and mastered separately against the full track count', () => {
    const summary = summarizeCertifications([
      row({ level: 'level4' }),
      row({ level: 'level3' }),
      row({ level: null }),
    ])

    expect(summary).toEqual({ certified: 2, mastered: 1, total: 3 })
  })

  it('reports zeroes for a student who has not sat any certification', () => {
    expect(summarizeCertifications([row({}), row({})])).toEqual({
      certified: 0,
      mastered: 0,
      total: 2,
    })
  })
})

describe('groupExams', () => {
  const exam = (id: string, status: string, scheduledAt: string) =>
    ({ id, status, scheduledAt }) as ApiExam

  it('puts scheduled and in-progress sittings in soonest-first order', () => {
    const { scheduled } = groupExams([
      exam('later', 'scheduled', '2026-09-10T10:00:00'),
      exam('now', 'inProgress', '2026-09-01T10:00:00'),
    ])

    expect(scheduled.map(e => e.id)).toEqual(['now', 'later'])
  })

  it('puts completed sittings in most-recent-first order', () => {
    const { completed } = groupExams([
      exam('old', 'completed', '2026-01-01T10:00:00'),
      exam('recent', 'completed', '2026-08-01T10:00:00'),
    ])

    expect(completed.map(e => e.id)).toEqual(['recent', 'old'])
  })

  it('returns empty groups when the exam table has nothing in it', () => {
    expect(groupExams([])).toEqual({ scheduled: [], completed: [] })
  })
})
