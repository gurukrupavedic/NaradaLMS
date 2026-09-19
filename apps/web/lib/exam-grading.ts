import type { ApiExamOutcome, ApiProficiencyLevel } from '@/lib/api/api-types'

// Mirrors apps/api/src/exams/grading.ts — the API is the authority (it derives the bonus, total and
// outcome itself and ignores anything sent for them); this copy exists only so the record-result
// form can show the total and outcome as the evaluator types. If the marks or thresholds change,
// change both files (and the `examResult` check constraints in packages/db) together.

export const EXAM_MARKS = [
  { key: 'aksharaShuddhi', label: 'Akshara Shuddhi', max: 50 },
  { key: 'swaraShuddhi', label: 'Swara Shuddhi', max: 30 },
  { key: 'niyantranaAnargalata', label: 'Niyantrana & Anargalata', max: 20 },
  { key: 'shraavyata', label: 'Shraavyata', max: 5 },
  { key: 'pratishakyaGrammar', label: 'Pratishakya Grammar Rules', max: 5 },
] as const

export type ExamMarkKey = (typeof EXAM_MARKS)[number]['key']
export type ExamMarks = Record<ExamMarkKey, number>

// The best possible total: every mark at its maximum, plus the largest children's bonus.
export const EXAM_MAX_TOTAL = EXAM_MARKS.reduce((sum, mark) => sum + mark.max, 0) + 10

export const EXAM_OUTCOME_LABEL: Record<ApiExamOutcome, string> = {
  athiUttamam: 'Athi Uttamam',
  prathamaSreni: 'Prathama Sreni',
  dwitiyaSreni: 'Dwitiya Sreni',
  level2: 'L2',
  level1: 'L1',
  reappear: 'Reappear',
}

/** +10 at age 11 or under, +5 at 12–15, none from 16 — age being the sitting's year minus the year of birth. */
export function childrenBonus(yearOfBirth: number, examYear: number): 0 | 5 | 10 {
  const age = examYear - yearOfBirth
  if (age <= 11) return 10
  if (age <= 15) return 5
  return 0
}

export function outcomeForTotal(total: number): ApiExamOutcome {
  if (total >= 105) return 'athiUttamam'
  if (total >= 95) return 'prathamaSreni'
  if (total >= 85) return 'dwitiyaSreni'
  if (total >= 75) return 'level2'
  if (total >= 65) return 'level1'
  return 'reappear'
}

export function levelForOutcome(outcome: ApiExamOutcome): ApiProficiencyLevel | null {
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
