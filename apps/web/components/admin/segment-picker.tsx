'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

import { cn } from '@/lib/utils'
import { useTextSelectionRange } from '@/lib/text-selection'

export type PickedSegment = { start: number; end: number }

type Slice = PickedSegment & { text: string; segmentIndex: number | null }

function overlaps(a: PickedSegment, b: PickedSegment): boolean {
  return a.start < b.end && a.end > b.start
}

function hasOverlap(segments: PickedSegment[], range: PickedSegment): boolean {
  return segments.some(s => overlaps(s, range))
}

export function excerpt(text: string, start: number, end: number, max = 32): string {
  const slice = text.slice(start, end).trim()
  return slice.length > max ? `${slice.slice(0, max - 1)}…` : slice
}

/** Splits `text` into runs that share one segment (or none), the same shape the text is rendered in. */
function buildSlices(text: string, segments: PickedSegment[]): Slice[] {
  if (segments.length === 0) return [{ start: 0, end: text.length, text, segmentIndex: null }]

  const points = new Set<number>([0, text.length])
  for (const s of segments) {
    points.add(s.start)
    points.add(s.end)
  }
  const sorted = [...points].sort((a, b) => a - b)

  const slices: Slice[] = []
  for (let i = 0; i < sorted.length - 1; i++) {
    const start = sorted[i]!
    const end = sorted[i + 1]!
    if (start === end) continue
    const segmentIndex = segments.findIndex(s => s.start <= start && s.end >= end)
    slices.push({ start, end, text: text.slice(start, end), segmentIndex: segmentIndex >= 0 ? segmentIndex : null })
  }
  return slices
}

/**
 * A select-and-confirm text segmenter: highlight a run of text the way you'd highlight it to
 * copy it, and a bar below offers to turn that selection into a segment. Using the browser's own
 * selection (rather than a custom click-drag surface) means shift-click, shift-arrow, and
 * double-click-to-select-a-word all work here for free, and the offsets it produces are snapped
 * to whole grapheme clusters (`lib/text-selection.ts`) so a selection can never land mid-conjunct
 * in Devanagari or mid vowel-sign in Telugu.
 *
 * Segments deliberately don't have to cover the whole text — a verse separator or stray
 * punctuation between lines can legitimately sit outside every segment. A selection that overlaps
 * an existing segment is refused rather than merged or replacing it — removing the old one first
 * keeps segment edits a single unambiguous action.
 *
 * `readOnly` repurposes the same rendering as a *viewer*: no selection bar, and clicking an
 * already-marked run reports which segment it's in via `onSelectSegment` instead of editing
 * anything — what the audio mapping step uses to show, and pick, which text a mapping refers to.
 * The row list below is also the keyboard-accessible way to select a segment there, since the
 * text itself only responds to pointer clicks.
 */
export function SegmentPicker({
  text,
  fontClass,
  segments,
  onChange,
  readOnly = false,
  selectedIndex = null,
  onSelectSegment,
}: {
  text: string
  fontClass?: string
  segments: PickedSegment[]
  onChange?: (segments: PickedSegment[]) => void
  readOnly?: boolean
  selectedIndex?: number | null
  onSelectSegment?: (index: number) => void
}) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null)
  const { pendingRange, clearPendingRange, readSelectionRange } = useTextSelectionRange({ containerRef, text })

  const pendingOverlap = pendingRange !== null && hasOverlap(segments, pendingRange)

  const addSegment = useCallback(() => {
    if (!pendingRange || hasOverlap(segments, pendingRange)) return
    onChange?.([...segments, pendingRange].sort((a, b) => a.start - b.start))
    clearPendingRange()
  }, [clearPendingRange, onChange, pendingRange, segments])

  useEffect(() => {
    if (readOnly) return
    const handler = (event: KeyboardEvent) => {
      if (event.key !== 'Enter' || !pendingRange || pendingOverlap) return
      event.preventDefault()
      addSegment()
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [addSegment, pendingOverlap, pendingRange, readOnly])

  function removeSegment(index: number) {
    onChange?.(segments.filter((_, i) => i !== index))
  }

  if (!text) return <p className="label text-ink-muted">No text yet.</p>

  const slices = buildSlices(text, segments)

  return (
    <div className="space-y-2.5">
      <div
        ref={containerRef}
        onMouseUp={readOnly ? undefined : readSelectionRange}
        className={cn(
          !readOnly && 'cursor-text select-text',
          'whitespace-pre-wrap border border-rule-soft bg-ink/[0.02] p-2.5 text-[0.9375rem] leading-relaxed',
          fontClass,
        )}
      >
        {slices.map((slice, i) => {
          const isSegmented = slice.segmentIndex !== null
          const isSelected = isSegmented && slice.segmentIndex === selectedIndex
          const isHovered = isSegmented && slice.segmentIndex === hoveredIndex
          return (
            <span
              key={i}
              onClick={readOnly && isSegmented ? () => onSelectSegment?.(slice.segmentIndex!) : undefined}
              onMouseEnter={() => {
                if (isSegmented) setHoveredIndex(slice.segmentIndex)
              }}
              onMouseLeave={() => setHoveredIndex(null)}
              className={cn(
                'transition-colors',
                readOnly && isSegmented && 'cursor-pointer',
                isSegmented && !isSelected && (isHovered ? 'bg-indigo/30' : 'bg-indigo/20'),
                isSelected && 'bg-vermilion/25',
              )}
            >
              {slice.text}
            </span>
          )
        })}
      </div>

      {!readOnly && (
        <div className="flex h-9 items-center gap-2.5 border border-rule-soft bg-ink/[0.02] px-2.5">
          {pendingRange ? (
            <>
              <span className="label font-mono text-ink-muted">
                {pendingRange.start}–{pendingRange.end}
              </span>
              <span className="flex-1 truncate text-[0.8125rem] text-ink-muted">
                {text.slice(pendingRange.start, pendingRange.end)}
              </span>
              {pendingOverlap ? (
                <span className="label shrink-0 text-vermilion">Overlaps existing segment</span>
              ) : (
                <button
                  type="button"
                  onClick={addSegment}
                  className="label shrink-0 border border-rule px-2 py-1 text-ink-muted transition-colors hover:border-vermilion hover:text-vermilion"
                >
                  Add segment <span className="ml-1 opacity-60">↵</span>
                </button>
              )}
            </>
          ) : (
            <span className="label text-ink-muted/50">Select text above to mark a segment</span>
          )}
        </div>
      )}

      {segments.length === 0 ? (
        <p className="label text-ink-muted">{readOnly ? 'No segments yet.' : 'No segments yet — select text above to mark one.'}</p>
      ) : (
        <ul className="space-y-1">
          {segments.map((s, i) => (
            <li
              key={`${s.start}-${s.end}`}
              className="flex items-center gap-2.5"
              onMouseEnter={() => setHoveredIndex(i)}
              onMouseLeave={() => setHoveredIndex(null)}
            >
              {readOnly ? (
                <button
                  type="button"
                  onClick={() => onSelectSegment?.(i)}
                  className={cn(
                    'label flex-1 truncate text-left transition-colors hover:text-vermilion',
                    i === selectedIndex ? 'text-vermilion' : 'text-ink-muted',
                  )}
                >
                  {i + 1}. {excerpt(text, s.start, s.end)}{' '}
                  <span className="font-mono text-ink-muted/60">
                    {s.start}–{s.end}
                  </span>
                </button>
              ) : (
                <span className="label flex-1 truncate text-ink-muted">
                  {i + 1}. {excerpt(text, s.start, s.end)}{' '}
                  <span className="font-mono text-ink-muted/60">
                    {s.start}–{s.end}
                  </span>
                </span>
              )}
              {!readOnly && (
                <button
                  type="button"
                  onClick={() => removeSegment(i)}
                  className="label text-ink-muted transition-colors hover:text-vermilion"
                >
                  Remove
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
