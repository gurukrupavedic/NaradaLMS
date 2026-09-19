import { describe, expect, it } from 'vitest'

import {
  childrenBonus,
  EXAM_MARK_MAX,
  gradeExam,
  levelForOutcome,
  outcomeForTotal,
  type ExamMarks,
} from './grading'

const full: ExamMarks = { ...EXAM_MARK_MAX }
const zero: ExamMarks = {
  aksharaShuddhi: 0,
  swaraShuddhi: 0,
  niyantranaAnargalata: 0,
  shraavyata: 0,
  pratishakyaGrammar: 0,
}

describe('outcomeForTotal', () => {
  it.each([
    [0, 'reappear'],
    [64, 'reappear'],
    [65, 'level1'],
    [74, 'level1'],
    [75, 'level2'],
    [84, 'level2'],
    [85, 'dwitiyaSreni'],
    [94, 'dwitiyaSreni'],
    [95, 'prathamaSreni'],
    [104, 'prathamaSreni'],
    [105, 'athiUttamam'],
    [120, 'athiUttamam'],
  ] as const)('a total of %i is %s', (total, outcome) => {
    expect(outcomeForTotal(total)).toBe(outcome)
  })
})

describe('levelForOutcome', () => {
  it.each([
    ['athiUttamam', 'level4'],
    ['prathamaSreni', 'level4'],
    ['dwitiyaSreni', 'level3'],
    ['level2', 'level2'],
    ['level1', 'level1'],
    ['reappear', null],
  ] as const)('%s grants %s', (outcome, level) => {
    expect(levelForOutcome(outcome)).toBe(level)
  })
})

describe('childrenBonus', () => {
  // Exam year 2026: born 2015 is 11, 2014 is 12, 2011 is 15, 2010 is 16.
  it.each([
    [2026, 10], // newborn — still 11 or under
    [2015, 10],
    [2014, 5],
    [2011, 5],
    [2010, 0],
    [1990, 0],
  ] as const)('born %i earns %i', (yearOfBirth, bonus) => {
    expect(childrenBonus(yearOfBirth, 2026)).toBe(bonus)
  })
})

describe('gradeExam', () => {
  it('totals every mark plus the children bonus', () => {
    const graded = gradeExam(
      {
        aksharaShuddhi: 40,
        swaraShuddhi: 25,
        niyantranaAnargalata: 15,
        shraavyata: 4,
        pratishakyaGrammar: 3,
      },
      2014,
      2026,
    )
    expect(graded).toEqual({ childrenBonus: 5, total: 92, outcome: 'dwitiyaSreni' })
  })

  it('cannot reach Athi Uttamam on the core marks alone', () => {
    // 100 base, an adult with no bonus marks: Prathama Sreni is the ceiling.
    const graded = gradeExam(
      { ...zero, aksharaShuddhi: 50, swaraShuddhi: 30, niyantranaAnargalata: 20 },
      1990,
      2026,
    )
    expect(graded).toEqual({ childrenBonus: 0, total: 100, outcome: 'prathamaSreni' })
  })

  it('the maximum possible total is 120', () => {
    expect(gradeExam(full, 2020, 2026).total).toBe(120)
  })

  it('lets bonus marks lift a candidate over a boundary', () => {
    // 60 on the core marks fails, but 5 + 5 for the bonus sections makes 70 — a level 1 pass.
    const graded = gradeExam(
      {
        ...zero,
        aksharaShuddhi: 30,
        swaraShuddhi: 20,
        niyantranaAnargalata: 10,
        shraavyata: 5,
        pratishakyaGrammar: 5,
      },
      1990,
      2026,
    )
    expect(graded).toEqual({ childrenBonus: 0, total: 70, outcome: 'level1' })
  })
})
