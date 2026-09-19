import type { examOutcome, proficiencyLevel } from '@narada/db'

export type ExamOutcome = (typeof examOutcome.enumValues)[number]
type ProficiencyLevel = (typeof proficiencyLevel.enumValues)[number]

// The certification exam's mark sheet. The first three are the core marks (100 between them);
// Shraavyata and Pratishakya Grammar are scored out of 5 each on top; the children's bonus is
// never entered — it comes from the student's age (see `childrenBonus`). So the best possible
// total is 100 + 5 + 5 + 10 = 120. `packages/db`'s `examResult` check constraints repeat these
// bounds, and `apps/web/lib/exam-grading.ts` mirrors this file for the live total in the form —
// change all three together.
export const EXAM_MARK_MAX = {
  aksharaShuddhi: 50,
  swaraShuddhi: 30,
  niyantranaAnargalata: 20,
  shraavyata: 5,
  pratishakyaGrammar: 5,
} as const

export type ExamMarks = { [Mark in keyof typeof EXAM_MARK_MAX]: number }

/**
 * +10 for a child aged 11 or under, +5 for 12–15, nothing from 16. Age is the exam year minus the
 * year of birth — a year of birth is all a profile records, so a child born late in the year can
 * land on the generous side of a boundary by up to a year; that's accepted, and the evaluator
 * cannot override it.
 */
export function childrenBonus(yearOfBirth: number, examYear: number): 0 | 5 | 10 {
  const age = examYear - yearOfBirth
  if (age <= 11) return 10
  if (age <= 15) return 5
  return 0
}

export function outcomeForTotal(total: number): ExamOutcome {
  if (total >= 105) return 'athiUttamam'
  if (total >= 95) return 'prathamaSreni'
  if (total >= 85) return 'dwitiyaSreni'
  if (total >= 75) return 'level2'
  if (total >= 65) return 'level1'
  return 'reappear'
}

/** The proficiency level an outcome grants — `null` for a fail, which grants nothing. Athi Uttamam is L4 with honours, not a level of its own. */
export function levelForOutcome(outcome: ExamOutcome): ProficiencyLevel | null {
  switch (outcome) {
    case 'athiUttamam':
    case 'prathamaSreni':
      return 'level4'
    case 'dwitiyaSreni':
      return 'level3'
    case 'level2':
      return 'level2'
    case 'level1':
      return 'level1'
    case 'reappear':
      return null
  }
}

export type GradedExam = { childrenBonus: 0 | 5 | 10; total: number; outcome: ExamOutcome }

export function gradeExam(marks: ExamMarks, yearOfBirth: number, examYear: number): GradedExam {
  const bonus = childrenBonus(yearOfBirth, examYear)
  const total =
    marks.aksharaShuddhi +
    marks.swaraShuddhi +
    marks.niyantranaAnargalata +
    marks.shraavyata +
    marks.pratishakyaGrammar +
    bonus
  return { childrenBonus: bonus, total, outcome: outcomeForTotal(total) }
}
