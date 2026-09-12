export type ProficiencyLevel =
  | 'notStarted'
  | 'practicing'
  | 'level1'
  | 'level2'
  | 'level3'
  | 'level4'
  | 'absent'

export const PROFICIENCY_LEVELS: ProficiencyLevel[] = [
  'notStarted',
  'absent',
  'practicing',
  'level1',
  'level2',
  'level3',
  'level4',
]

const PROFICIENCY_CONFIG: Record<
  ProficiencyLevel,
  { label: string; shortLabel: string; bg: string; text: string }
> = {
  notStarted: {
    label: 'Not Started',
    shortLabel: '—',
    bg: 'bg-muted',
    text: 'text-muted-foreground',
  },
  practicing: {
    label: 'Practicing',
    shortLabel: 'P',
    bg: 'bg-amber-500 dark:bg-amber-600',
    text: 'text-white',
  },
  level1: {
    label: 'Level 1',
    shortLabel: 'L1',
    bg: 'bg-emerald-600 dark:bg-emerald-700',
    text: 'text-white',
  },
  level2: {
    label: 'Level 2',
    shortLabel: 'L2',
    bg: 'bg-teal-700 dark:bg-teal-800',
    text: 'text-white',
  },
  level3: {
    label: 'Level 3',
    shortLabel: 'L3',
    bg: 'bg-violet-600 dark:bg-violet-700',
    text: 'text-white',
  },
  level4: {
    label: 'Level 4',
    shortLabel: 'L4',
    bg: 'bg-purple-600 dark:bg-purple-800',
    text: 'text-white',
  },
  absent: {
    label: 'Absent',
    shortLabel: 'A',
    bg: 'bg-neutral-200 dark:bg-neutral-700',
    text: 'text-neutral-600 dark:text-neutral-300',
  },
}

export function getProficiencyConfig(level: ProficiencyLevel) {
  return PROFICIENCY_CONFIG[level]
}

export function isStartedProficiency(level: ProficiencyLevel): boolean {
  return level !== 'notStarted' && level !== 'absent'
}

export function isMasteredProficiency(level: ProficiencyLevel): boolean {
  return level === 'level4'
}

export function getProficiencyProgress(levels: ProficiencyLevel[]): number {
  if (levels.length === 0) {
    return 0
  }

  const startedLevels = levels.filter(isStartedProficiency)
  return (startedLevels.length / levels.length) * 100
}

// A chapter counts toward "progress" the moment it's started (practicing or above) — this
// answers "how much has been touched," not "how much has been mastered." Pair with this
// wherever progress is shown, rather than letting one number stand in for both.
export function getMasteredProgress(levels: ProficiencyLevel[]): number {
  if (levels.length === 0) {
    return 0
  }

  const masteredLevels = levels.filter(isMasteredProficiency)
  return (masteredLevels.length / levels.length) * 100
}
