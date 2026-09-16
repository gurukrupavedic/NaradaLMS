export type ProficiencyLevel =
  | 'notStarted'
  | 'absent'
  | 'level1'
  | 'level2'
  | 'level3'
  | 'level4'

export const PROFICIENCY_ORDER: ProficiencyLevel[] = [
  'notStarted',
  'absent',
  'level1',
  'level2',
  'level3',
  'level4',
]

// L1 marks "done with classroom instruction, not yet examined by a TA" — a
// real, common resting state (there's a whole population of students sitting
// there), not a synonym for "started." L2/L3 are intermediate exam results;
// L4 is the only one that also certifies the track (see `isCertified`).
export const PROFICIENCY_LABEL: Record<ProficiencyLevel, string> = {
  notStarted: 'Not Started',
  absent: 'Absent',
  level1: 'L1',
  level2: 'L2',
  level3: 'L3',
  level4: 'L4',
}

export const PROFICIENCY_SHORT: Record<ProficiencyLevel, string> = {
  notStarted: '—',
  absent: 'A',
  level1: 'L1',
  level2: 'L2',
  level3: 'L3',
  level4: 'L4',
}

// The register's own colour sense, not a fresh pick — see globals.css's header
// note on why this replaced the single deepening indigo ramp, and why it's
// still two disciplined families (green, purple) rather than the five stray
// hues that came before *that*. Colour doesn't track depth alone: level 2
// (light green) and level 3 (full green) are looked up independently even
// though level 1 and level 4 each stand alone in their own hue.
export const LEVEL_INK: Record<ProficiencyLevel, string> = {
  notStarted: 'bg-mark-not-started',
  absent: 'bg-mark-absent',
  level1: 'bg-mark-level1',
  level2: 'bg-mark-level2',
  level3: 'bg-mark-level3',
  level4: 'bg-mark-level4',
}

// Which family ink a cell should be read against for text contrast — the
// "light" cell (level 2) takes dark ink text, level 3/4 (the base inks,
// undiluted, both clearly dark) take card (light) text. Level 1's ochre is
// the odd one out — see `--mark-ink-fixed` in globals.css for why it gets its
// own always-dark token instead of the theme-flipping `text-ink`/`text-card`.
export const LEVEL_TEXT: Record<ProficiencyLevel, string> = {
  notStarted: 'text-ink-muted/35',
  absent: 'text-ink-muted',
  level1: 'text-mark-ink-fixed',
  level2: 'text-ink',
  level3: 'text-card',
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
