'use client'

import { useCallback, useEffect, useState, type RefObject } from 'react'

export type TextRange = { start: number; end: number }

/**
 * Grows a raw selection out to the nearest whole grapheme clusters on each end — a plain mouse
 * selection lands wherever the pointer happened to be, which for Devanagari/Telugu can be mid
 * conjunct or mid vowel-sign. Saving a segment cut there would slice a rendered glyph in half the
 * next time it's read back. Falls back to the raw range on an engine without `Intl.Segmenter`.
 */
export function snapToGraphemeBoundaries(text: string, start: number, end: number): TextRange | null {
  if (typeof Intl === 'undefined' || !('Segmenter' in Intl)) {
    return start < end ? { start, end } : null
  }

  const segmenter = new Intl.Segmenter(undefined, { granularity: 'grapheme' })
  let snappedStart = start
  let snappedEnd = end

  for (const { index, segment } of segmenter.segment(text)) {
    const segEnd = index + segment.length
    if (start > index && start < segEnd) snappedStart = index
    if (end > index && end < segEnd) snappedEnd = segEnd
  }

  return snappedStart < snappedEnd ? { start: snappedStart, end: snappedEnd } : null
}

/**
 * Reads the browser's own selection and converts it to character offsets into `fullText` — the
 * DOM only knows node/offset pairs, so this walks a throwaway `Range` from the container's start
 * up to the selection boundary and measures the resulting string length. Ignores a selection that
 * isn't inside `container` (e.g. the admin selected the segment-count label instead of the text).
 */
export function getTextSelectionRange(container: HTMLElement, fullText: string): TextRange | null {
  const selection = window.getSelection()
  if (!selection || selection.rangeCount === 0 || selection.isCollapsed) return null
  if (!container.contains(selection.anchorNode) || !container.contains(selection.focusNode)) {
    return null
  }

  const range = selection.getRangeAt(0)
  const preRange = document.createRange()
  preRange.selectNodeContents(container)
  preRange.setEnd(range.startContainer, range.startOffset)
  const start = preRange.toString().length

  preRange.setEnd(range.endContainer, range.endOffset)
  const end = preRange.toString().length

  return snapToGraphemeBoundaries(fullText, start, end)
}

export function clearTextSelection() {
  window.getSelection()?.removeAllRanges()
}

/**
 * Tracks the admin's current text selection inside `containerRef` as a pending (not-yet-saved)
 * segment range. A click outside the container that also leaves the container's own selection
 * clears the pending range — otherwise it would keep showing a stale "add segment?" prompt for a
 * selection that's no longer highlighted on screen.
 */
export function useTextSelectionRange({
  containerRef,
  text,
}: {
  containerRef: RefObject<HTMLElement | null>
  text: string
}) {
  const [pendingRange, setPendingRange] = useState<TextRange | null>(null)

  const readSelectionRange = useCallback(() => {
    const container = containerRef.current
    if (!container) return
    setPendingRange(getTextSelectionRange(container, text))
  }, [containerRef, text])

  const clearPendingRange = useCallback(() => {
    setPendingRange(null)
    clearTextSelection()
  }, [])

  useEffect(() => {
    const handler = (event: MouseEvent) => {
      const container = containerRef.current
      if (!container || container.contains(event.target as Node)) return

      const selection = window.getSelection()
      if (!selection || !container.contains(selection.anchorNode ?? null)) {
        setPendingRange(null)
      }
    }

    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [containerRef])

  return { pendingRange, clearPendingRange, readSelectionRange }
}
