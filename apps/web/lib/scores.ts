import type { ApiBatchMember } from '@/lib/api/api-types'

/**
 * The three teacher/TA judgements shown beside the chapter marks — each -1, 0 or 1, null while
 * nobody has assessed it yet (which is not the same as 0). Stored on the student's `enrollment`
 * row, so they belong to one batch, not to the student for good.
 */
export type ScoreValue = -1 | 0 | 1
export type Score = ScoreValue | null

export const SCORE_KEYS = ['attendance', 'recitation', 'backlog'] as const
export type ScoreKey = (typeof SCORE_KEYS)[number]

export type StudentScores = Record<ScoreKey, Score>

export const SCORE_LABEL: Record<ScoreKey, string> = {
  attendance: 'Attendance',
  recitation: 'Recitation',
  backlog: 'Backlog',
}

// What each end of the scale means, per score — the one place the teacher is told, so a −1 and a
// +1 mean the same thing to everyone setting them.
export const SCORE_MEANING: Record<ScoreKey, Record<ScoreValue, string>> = {
  attendance: { [-1]: 'Often absent', 0: 'Mixed', 1: 'Regular' },
  recitation: { [-1]: 'Needs work', 0: 'Fair', 1: 'Strong' },
  backlog: { [-1]: 'Far behind', 0: 'Some', 1: 'Caught up' },
}

// Column headings, short enough for a 3.25rem column; the full title rides in the tooltip.
export const SCORE_SHORT: Record<ScoreKey, string> = {
  attendance: 'Attend',
  recitation: 'Recite',
  backlog: 'Backlog',
}

// The full name of what each column judges, for tooltips and the student's own view.
export const SCORE_TITLE: Record<ScoreKey, string> = {
  attendance: 'Attendance over the last 4 weeks',
  recitation: 'Overall recitation — swaram, sravyata and the rest',
  backlog: 'In-class backlog',
}

export function scoresOf(member: ApiBatchMember): StudentScores {
  return {
    attendance: member.attendanceScore,
    recitation: member.recitationScore,
    backlog: member.backlogScore,
  }
}

/** −1 / 0 / +1, with a real minus sign; an unassessed score is an empty string. */
export function formatScore(score: Score): string {
  if (score === null) return ''
  if (score === 0) return '0'
  return score > 0 ? '+1' : '−1'
}
