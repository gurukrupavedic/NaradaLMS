import type { ApiProficiencyLevel } from '@/lib/api/api-types'

// The self-reported starting point a prospective student picks on the registration form —
// distinct from `lib/proficiency.ts`'s staff-assessed vocabulary ("L1"/"Not Started"). `absent` is
// excluded on purpose: it means "no evaluation exists," a teacher-side concept a self-report never
// has a reason to claim.
export const SELF_REPORTED_PROFICIENCY_LABEL: Partial<Record<ApiProficiencyLevel, string>> = {
  notStarted: 'Just starting',
  practicing: 'Practicing on my own',
  level1: 'Level 1',
  level2: 'Level 2',
  level3: 'Level 3',
  level4: 'Level 4',
}

export const SELF_REPORTED_PROFICIENCY_OPTIONS: { value: ApiProficiencyLevel; label: string }[] =
  Object.entries(SELF_REPORTED_PROFICIENCY_LABEL).map(([value, label]) => ({
    value: value as ApiProficiencyLevel,
    label,
  }))
