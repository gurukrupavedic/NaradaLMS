'use client'

import { useMemo, useState } from 'react'

import { cn } from '@/lib/utils'

type Segment = { start: number; end: number }

/** Matches a verse-end marker (danda/double-danda, optionally followed by a numeral) or a newline — the seed points `autoSplit` breaks on. */
const AUTO_SPLIT_PATTERN = /(?:[।॥][\s०-९0-9]*)|\n/gu

function boundariesFromSegments(segments: Segment[], textLength: number): number[] {
  const points = new Set<number>([0, textLength])
  for (const s of segments) {
    points.add(s.start)
    points.add(s.end)
  }
  return Array.from(points).sort((a, b) => a - b)
}

function segmentsFromBoundaries(boundaries: number[]): Segment[] {
  const segments: Segment[] = []
  for (let i = 0; i < boundaries.length - 1; i++) {
    segments.push({ start: boundaries[i], end: boundaries[i + 1] })
  }
  return segments
}

function autoSplitPoints(text: string): number[] {
  const points = new Set<number>()
  for (const match of text.matchAll(AUTO_SPLIT_PATTERN)) {
    const end = (match.index ?? 0) + match[0].length
    if (end > 0 && end < text.length) points.add(end)
  }
  return Array.from(points)
}

/**
 * Click-to-place-boundary segmentation editor: renders `text` as individual characters with a thin
 * clickable gap between each one, so a boundary is always an exact character offset — the same unit
 * `ChapterScriptSegment.start/end` stores. Boundaries at 0 and `text.length` are implicit and fixed;
 * every gap in between toggles on click. Segments derive from the sorted boundary set, never tracked
 * separately, so there is no way for the segment list to disagree with the text underneath it.
 */
export function SegmentSplitter({
  text,
  segments,
  onChange,
  fontClass,
}: {
  text: string
  segments: Segment[]
  onChange: (segments: Segment[]) => void
  fontClass?: string
}) {
  const [selected, setSelected] = useState<number | null>(null)

  const boundaries = useMemo(() => boundariesFromSegments(segments, text.length), [segments, text.length])
  const chars = useMemo(() => Array.from(text), [text])

  function toggleBoundary(offset: number) {
    if (offset <= 0 || offset >= text.length) return
    const next = new Set(boundaries)
    if (next.has(offset)) next.delete(offset)
    else next.add(offset)
    onChange(segmentsFromBoundaries(Array.from(next).sort((a, b) => a - b)))
    setSelected(null)
  }

  function mergeWithNext(index: number) {
    if (index >= segments.length - 1) return
    const next = boundaries.filter(b => b !== segments[index].end)
    onChange(segmentsFromBoundaries(next))
    setSelected(null)
  }

  function autoSplit() {
    const points = new Set([0, text.length, ...autoSplitPoints(text)])
    onChange(segmentsFromBoundaries(Array.from(points).sort((a, b) => a - b)))
    setSelected(null)
  }

  // Running offset per rendered character, so click handlers can toggle the boundary just after it.
  let offset = 0

  return (
    <div className="space-y-2.5">
      <div className="flex items-center justify-between">
        <span className="label text-ink-muted">Text — click between characters to split</span>
        <button
          type="button"
          onClick={autoSplit}
          className="label text-ink-muted hover:text-vermilion"
        >
          Auto-split on verse-end
        </button>
      </div>

      <div
        className={cn(
          'border border-rule bg-paper p-2.5 text-[0.9375rem] leading-loose break-words',
          fontClass,
        )}
      >
        {chars.map((char, i) => {
          const charEnd = offset + char.length
          const gapOffset = charEnd
          const isBoundary = boundaries.includes(gapOffset) && gapOffset < text.length
          const segmentIndex = segments.findIndex(s => offset >= s.start && offset < s.end)
          const isSelected = selected === segmentIndex
          const el = (
            <span key={i} className="inline">
              <span className={cn(isSelected && 'bg-vermilion/15')} onClick={() => setSelected(segmentIndex)}>
                {char}
              </span>
              {gapOffset < text.length && (
                <button
                  type="button"
                  aria-label={isBoundary ? `Remove split at ${gapOffset}` : `Split at ${gapOffset}`}
                  onClick={() => toggleBoundary(gapOffset)}
                  className={cn(
                    'inline-block w-px align-middle',
                    isBoundary ? 'mx-0.5 h-3.5 bg-vermilion' : 'h-3.5 hover:bg-ink/20',
                  )}
                />
              )}
            </span>
          )
          offset = charEnd
          return el
        })}
      </div>

      <div className="border border-rule">
        <table className="w-full text-left text-[0.8125rem]">
          <thead>
            <tr className="border-b border-rule text-ink-muted">
              <th className="label px-2 py-1.5 font-normal">#</th>
              <th className="label px-2 py-1.5 font-normal">Text</th>
              <th className="label px-2 py-1.5 font-normal">Chars</th>
              <th className="label px-2 py-1.5 font-normal" />
            </tr>
          </thead>
          <tbody>
            {segments.map((s, i) => (
              <tr
                key={`${s.start}-${s.end}`}
                onClick={() => setSelected(i)}
                className={cn('cursor-pointer border-b border-rule-soft last:border-b-0', selected === i && 'bg-vermilion/5')}
              >
                <td className="px-2 py-1.5 text-ink-muted">{i + 1}</td>
                <td className={cn('px-2 py-1.5', fontClass)}>{text.slice(s.start, s.end)}</td>
                <td className="px-2 py-1.5 font-mono text-ink-muted">
                  {s.start}–{s.end}
                </td>
                <td className="px-2 py-1.5 text-right">
                  {i < segments.length - 1 && (
                    <button
                      type="button"
                      onClick={e => {
                        e.stopPropagation()
                        mergeWithNext(i)
                      }}
                      className="label text-ink-muted hover:text-vermilion"
                    >
                      Merge ⌫
                    </button>
                  )}
                </td>
              </tr>
            ))}
            {segments.length === 0 && (
              <tr>
                <td colSpan={4} className="label px-2 py-2 text-ink-muted">
                  No segments yet — click between characters above to add a split.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <p className="label text-ink-muted">{segments.length} segment{segments.length === 1 ? '' : 's'}</p>
    </div>
  )
}
