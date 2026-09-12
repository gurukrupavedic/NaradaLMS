import { cn } from '@/lib/utils'
import {
  GRADED_LEVELS,
  LEVEL_INK,
  LEVEL_TEXT,
  PROFICIENCY_LABEL,
  PROFICIENCY_SHORT,
  type ProficiencyLevel,
} from '@/lib/proficiency'

/**
 * Proficiency as a solid, labelled chip — the mark book's own cell treatment
 * (colour fill + short code), pulled out for the one-level-at-a-time spots: a
 * chapter row, a certification row, the legend.
 *
 * This replaces four small beads on a thread, which read cleanly once the
 * scale was a single deepening ink but got hard to tell apart once colour
 * started carrying real information (which family, still-learning green vs.
 * certified purple) — a light dot at bead size just doesn't have enough
 * surface area to hold a colour distinction. A solid chip does, and the short
 * code inside is a second channel that never depends on colour at all.
 *
 * Square corners, not rounded — this register cuts corners everywhere else
 * (see `--radius` in globals.css), and a rounded capsule is exactly the
 * glossy-badge look the very first version of this scale was replaced for.
 */

const SIZES = {
  sm: 'h-4 min-w-5 px-1 text-[0.5625rem]',
  md: 'h-5 min-w-6 px-1.5 text-[0.625rem]',
  lg: 'h-6 min-w-7 px-2 text-[0.6875rem]',
} as const

interface PillProps {
  level: ProficiencyLevel
  size?: keyof typeof SIZES
  className?: string
}

export function Pill({ level, size = 'md', className }: PillProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center justify-center font-mono leading-none font-medium tabular-nums',
        SIZES[size],
        LEVEL_INK[level],
        LEVEL_TEXT[level],
        // "Not started" is the one state with nothing recorded at all — dashed
        // says "empty" the same way the mark book's own blank cells do, not a
        // real (if pale) reading the way every other chip is.
        level === 'notStarted' && 'border border-dashed border-rule',
        className,
      )}
      role="img"
      aria-label={PROFICIENCY_LABEL[level]}
    >
      {PROFICIENCY_SHORT[level]}
    </span>
  )
}

/**
 * One key, once, above the thing it decodes — never repeated per row.
 */
export function PillKey({ className }: { className?: string }) {
  return (
    <div className={cn('flex flex-wrap items-center gap-x-5 gap-y-2', className)}>
      {GRADED_LEVELS.map(level => (
        <span key={level} className="flex items-center gap-2">
          <Pill level={level} size="sm" />
          <span className="label text-ink-muted">{PROFICIENCY_LABEL[level]}</span>
        </span>
      ))}
    </div>
  )
}
