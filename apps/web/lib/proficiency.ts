export type ProficiencyLevel =
  | 'notStarted'
  | 'absent'
  | 'level0'
  | 'level1'
  | 'level2'
  | 'level3'
  | 'level4'

export const PROFICIENCY_ORDER: ProficiencyLevel[] = [
  'notStarted',
  'absent',
  'level0',
  'level1',
  'level2',
  'level3',
  'level4',
]

// L0 marks "the lesson has been taught" — a real, common resting state (there's
// a whole population of students sitting there), not a synonym for "started."
// L1 is low proficiency, L2 high proficiency, L3 mastery. L0-L3 are all a
// teacher's own grades; L4 is the exception — it only ever comes from an exam
// evaluation, never the teacher directly (see apps/api/src/evaluations/
// schema.ts's teacherGradableLevelSchema) — and it's the only one that also
// certifies the track (see `isCertified`).
export const PROFICIENCY_LABEL: Record<ProficiencyLevel, string> = {
  notStarted: 'Not Started',
  absent: 'Absent',
  level0: 'L0',
  level1: 'L1',
  level2: 'L2',
  level3: 'L3',
  level4: 'L4',
}

export const PROFICIENCY_SHORT: Record<ProficiencyLevel, string> = {
  notStarted: '—',
  absent: 'A',
  level0: 'L0',
  level1: 'L1',
  level2: 'L2',
  level3: 'L3',
  level4: 'L4',
}

// The register's own colour sense, not a fresh pick — see globals.css's header
// note on why this replaced the single deepening indigo ramp, and why it's
// still three disciplined families (ochre, green, purple) rather than the five
// stray hues that came before *that*. Colour doesn't track depth alone: level 1
// (light green) and level 2 (full green), like level 3 (light purple) and level
// 4 (full purple), are looked up independently even though level 0 stands alone
// in its own hue.
export const LEVEL_INK: Record<ProficiencyLevel, string> = {
  notStarted: 'bg-mark-not-started',
  absent: 'bg-mark-absent',
  level0: 'bg-mark-level0',
  level1: 'bg-mark-level1',
  level2: 'bg-mark-level2',
  level3: 'bg-mark-level3',
  level4: 'bg-mark-level4',
}

// Which family ink a cell should be read against for text contrast — the
// "light" cells (levels 1 and 3) take dark ink text, level 2/4 (the base inks,
// undiluted, both clearly dark) take card (light) text. Level 0's ochre is
// the odd one out — see `--mark-ink-fixed` in globals.css for why it gets its
// own always-dark token instead of the theme-flipping `text-ink`/`text-card`.
export const LEVEL_TEXT: Record<ProficiencyLevel, string> = {
  notStarted: 'text-ink-muted/35',
  absent: 'text-ink-muted',
  level0: 'text-mark-ink-fixed',
  level1: 'text-ink',
  level2: 'text-card',
  level3: 'text-ink',
  level4: 'text-card',
}

export function isStarted(level: ProficiencyLevel): boolean {
  return level !== 'notStarted' && level !== 'absent'
}

export function isMastered(level: ProficiencyLevel): boolean {
  return level === 'level4'
}

// A track's certification result — L4 is the only score that certifies.
// Kept as its own named function rather than an alias for `isMastered`
// (even though they check the same thing today): one is a per-chapter
// "fully learned this one chapter" signal, the other a track-level
// "did they pass the certification exam" signal, and they've already drifted
// apart once — a call site asking "is this certified" shouldn't have to know
// it currently happens to mean the same thing as chapter mastery.
export function isCertified(level: ProficiencyLevel): boolean {
  return level === 'level4'
}

// Fraction of chapters that have been started (any graded level), as a
// 0–100 percentage — matches the production progress-bar semantics.
export function getProficiencyProgress(levels: ProficiencyLevel[]): number {
  if (levels.length === 0) return 0
  return (levels.filter(isStarted).length / levels.length) * 100
}

export function getMasteredProgress(levels: ProficiencyLevel[]): number {
  if (levels.length === 0) return 0
  return (levels.filter(isMastered).length / levels.length) * 100
}

export function countStarted(levels: ProficiencyLevel[]): number {
  return levels.filter(isStarted).length
}

export function countMastered(levels: ProficiencyLevel[]): number {
  return levels.filter(isMastered).length
}
