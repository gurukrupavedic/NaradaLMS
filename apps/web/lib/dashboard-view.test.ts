import { describe, expect, it } from 'vitest'

import type { ProficiencyLevel } from '@/lib/proficiency'
import type { ApiEvaluation } from '@/lib/types'

import {
  buildDashboardShape,
  countUnevaluatedStudents,
  findResumeChapter,
  isCertificationChapter,
  pluralize,
  sortTeachingByAttention,
  summarizeLearningTrack,
  trackLabel,
  type ChapterRow,
  type LearningTrack,
  type TeachingBatch,
} from './dashboard-view'

function chapter(code: string, level: ProficiencyLevel, title = `Chapter ${code}`): ChapterRow {
  return { id: code, code, title, level, evaluatedAt: null, isCertification: false }
}

function learning(overrides: Partial<LearningTrack> & { batchCode: string }): LearningTrack {
  return summarizeLearningTrack({
    batchId: overrides.batchCode,
    batchCode: overrides.batchCode,
    status: overrides.status ?? 'active',
    track: overrides.track ?? 'Track 1',
    chapters: overrides.chapters ?? [],
  })
}

function teaching(overrides: Partial<TeachingBatch> & { batchCode: string }): TeachingBatch {
  return {
    batchId: overrides.batchCode,
    batchCode: overrides.batchCode,
    status: overrides.status ?? 'active',
    track: overrides.track ?? 'Track 1',
    role: overrides.role ?? 'instructor',
    studentCount: overrides.studentCount ?? 0,
    progress: overrides.progress ?? 0,
    masteredProgress: overrides.masteredProgress ?? 0,
    unevaluatedCount: overrides.unevaluatedCount ?? 0,
  }
}

describe('trackLabel', () => {
  it('does not repeat the ordinal when the name is just "Track N"', () => {
    expect(trackLabel(1, 'Track 1')).toBe('Track 1')
  })

  it('appends a name that carries extra meaning', () => {
    expect(trackLabel(9, 'Graduated')).toBe('Track 9 · Graduated')
  })
})

describe('pluralize', () => {
  it('uses the singular for exactly one', () => {
    expect(pluralize(1, 'student')).toBe('1 student')
  })

  it('uses the plural for zero and many', () => {
    expect(pluralize(0, 'student')).toBe('0 students')
    expect(pluralize(12, 'student')).toBe('12 students')
  })
})

describe('isCertificationChapter', () => {
  it('recognizes the end-of-track certification chapter', () => {
    expect(isCertificationChapter({ title: 'TRACK 3 CERTIFICATION EXAM STATUS' })).toBe(true)
  })

  it('leaves ordinary chapters alone', () => {
    expect(isCertificationChapter({ title: 'Manyu Suktam' })).toBe(false)
  })
})

describe('summarizeLearningTrack', () => {
  it('counts started and mastered separately', () => {
    const track = learning({
      batchCode: 'B',
      chapters: [chapter('1.1', 'level2'), chapter('1.2', 'level4'), chapter('1.3', 'notStarted')],
    })

    expect(track.started).toBe(2)
    expect(track.mastered).toBe(1)
    expect(track.total).toBe(3)
  })

  it('treats absent as not started', () => {
    const track = learning({ batchCode: 'B', chapters: [chapter('1.1', 'absent')] })

    expect(track.started).toBe(0)
  })
})

describe('countUnevaluatedStudents', () => {
  it('counts only students with no evaluation at all', () => {
    const evaluations = [{ studentId: 'a' }, { studentId: 'a' }] as ApiEvaluation[]

    expect(countUnevaluatedStudents(['a', 'b', 'c'], evaluations)).toBe(2)
  })

  it('returns zero when everyone has been seen', () => {
    const evaluations = [{ studentId: 'a' }, { studentId: 'b' }] as ApiEvaluation[]

    expect(countUnevaluatedStudents(['a', 'b'], evaluations)).toBe(0)
  })
})

describe('sortTeachingByAttention', () => {
  it('puts batches with unevaluated students first', () => {
    const sorted = sortTeachingByAttention([
      teaching({ batchCode: 'SEEN', unevaluatedCount: 0, progress: 10 }),
      teaching({ batchCode: 'UNSEEN', unevaluatedCount: 4, progress: 90 }),
    ])

    expect(sorted.map(batch => batch.batchCode)).toEqual(['UNSEEN', 'SEEN'])
  })

  it('breaks ties by least progress, then by code for stability', () => {
    const sorted = sortTeachingByAttention([
      teaching({ batchCode: 'B', progress: 50 }),
      teaching({ batchCode: 'A', progress: 50 }),
      teaching({ batchCode: 'C', progress: 5 }),
    ])

    expect(sorted.map(batch => batch.batchCode)).toEqual(['C', 'A', 'B'])
  })
})

describe('findResumeChapter', () => {
  it('returns the earliest chapter that is not yet mastered', () => {
    const track = learning({
      batchCode: 'B',
      chapters: [chapter('1.1', 'level4'), chapter('1.2', 'level2'), chapter('1.3', 'notStarted')],
    })

    expect(findResumeChapter(track)?.code).toBe('1.2')
  })

  // Real students skip around — one had 3.3-3.6 marked while 3.1-3.2 sat untouched. The gap is
  // still the earliest outstanding work, so that is where they resume.
  it('prefers an earlier untouched chapter over a later started one', () => {
    const track = learning({
      batchCode: 'B',
      chapters: [chapter('3.1', 'notStarted'), chapter('3.2', 'notStarted'), chapter('3.3', 'level2')],
    })

    expect(findResumeChapter(track)?.code).toBe('3.1')
  })

  it('returns null once every chapter is mastered', () => {
    const track = learning({ batchCode: 'B', chapters: [chapter('1.1', 'level4')] })

    expect(findResumeChapter(track)).toBeNull()
  })
})

describe('buildDashboardShape', () => {
  // The batch this student sat in was closed at 4/10. Filing it under "completed" would hide
  // six chapters of outstanding work behind a disclosure.
  it('keeps a closed batch visible while the student still has chapters left', () => {
    const shape = buildDashboardShape(
      [
        learning({
          batchCode: 'CLOSED-BUT-UNFINISHED',
          status: 'completed',
          chapters: [chapter('3.1', 'notStarted'), chapter('3.2', 'level2')],
        }),
      ],
      [],
    )

    expect(shape.learning.active.map(t => t.batchCode)).toEqual(['CLOSED-BUT-UNFINISHED'])
    expect(shape.learning.archived).toHaveLength(0)
  })

  it('archives a closed batch once the student has been through every chapter', () => {
    const shape = buildDashboardShape(
      [
        learning({
          batchCode: 'DONE',
          status: 'completed',
          chapters: [chapter('1.1', 'level2'), chapter('1.2', 'level2')],
        }),
      ],
      [],
    )

    expect(shape.learning.archived.map(t => t.batchCode)).toEqual(['DONE'])
    expect(shape.learning.active).toHaveLength(0)
  })

  it('separates completed batches from live ones on both sides', () => {
    const shape = buildDashboardShape(
      [
        learning({ batchCode: 'L-OLD', status: 'completed' }),
        learning({ batchCode: 'L-NOW', status: 'active' }),
      ],
      [
        teaching({ batchCode: 'T-OLD', status: 'completed' }),
        teaching({ batchCode: 'T-NOW', status: 'active' }),
      ],
    )

    expect(shape.learning.active.map(t => t.batchCode)).toEqual(['L-NOW'])
    expect(shape.learning.archived.map(t => t.batchCode)).toEqual(['L-OLD'])
    expect(shape.teaching.active.map(t => t.batchCode)).toEqual(['T-NOW'])
    expect(shape.teaching.archived.map(t => t.batchCode)).toEqual(['T-OLD'])
  })

  it('leads with teaching when that is where the live work is', () => {
    const shape = buildDashboardShape(
      [learning({ batchCode: 'L', status: 'active' })],
      [
        teaching({ batchCode: 'T1', status: 'active' }),
        teaching({ batchCode: 'T2', status: 'active' }),
      ],
    )

    expect(shape.lead).toBe('teaching')
  })

  it('leads with learning when a teacher has no active batches left', () => {
    const shape = buildDashboardShape(
      [learning({ batchCode: 'L', status: 'active' })],
      [teaching({ batchCode: 'T', status: 'completed' })],
    )

    expect(shape.lead).toBe('learning')
  })

  it('ignores archived batches when deciding which half leads', () => {
    const shape = buildDashboardShape(
      [],
      Array.from({ length: 17 }, (_, i) =>
        teaching({ batchCode: `OLD-${i}`, status: 'completed' }),
      ),
    )

    expect(shape.lead).toBe('learning')
    expect(shape.teaching.archived).toHaveLength(17)
  })
})
