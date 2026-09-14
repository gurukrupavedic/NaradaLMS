export type MappableSegment = { id: string; text: string }
export type DraftMapping = { segmentId: string; audioStart: number; audioEnd: number }

export function roundToTenths(value: number): number {
  return Math.round(value * 10) / 10
}

export function formatTimestamp(totalSeconds: number): string {
  if (!Number.isFinite(totalSeconds) || totalSeconds < 0) return '0:00.0'
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = Math.floor(totalSeconds % 60)
  const tenths = Math.floor((totalSeconds % 1) * 10)
  return `${minutes}:${seconds.toString().padStart(2, '0')}.${tenths}`
}

/**
 * The state behind a "mark boundaries by listening" flow: rather than a flat table where every
 * row picks its own segment from a dropdown, exactly one segment is ever "armed" at a time — the
 * first one in chapter order with no mapping yet. Its suggested start is simply where the
 * previous segment's mapping ended, since recited lines are read back to back with no gap worth
 * making the admin re-locate by ear. Marking its end (via `markMappingEnd`) commits the mapping
 * and the next segment becomes armed on the following render, because `armedIndex` is always
 * derived fresh from `mappings`, never stored.
 */
export function createAudioMappingSession({
  segments,
  mappings,
  currentTime,
  duration,
  draftStarts = {},
}: {
  segments: MappableSegment[]
  mappings: DraftMapping[]
  currentTime: number
  duration: number
  draftStarts?: Record<string, number>
}) {
  const segmentIds = new Set(segments.map(s => s.id))
  const validMappings = mappings.filter(m => segmentIds.has(m.segmentId))
  const mappingMap = new Map(validMappings.map(m => [m.segmentId, m]))
  const armedIndex = segments.findIndex(s => !mappingMap.has(s.id))
  const resolvedArmedIndex = armedIndex === -1 ? null : armedIndex
  const armedSegment = resolvedArmedIndex !== null ? segments[resolvedArmedIndex] : null
  const suggestedStart =
    resolvedArmedIndex !== null
      ? resolvedArmedIndex === 0
        ? 0
        : (mappingMap.get(segments[resolvedArmedIndex - 1]!.id)?.audioEnd ?? 0)
      : null
  const nextMappedStart =
    resolvedArmedIndex !== null
      ? segments
          .slice(resolvedArmedIndex + 1)
          .map(s => mappingMap.get(s.id)?.audioStart)
          .find((start): start is number => start !== undefined)
      : undefined
  const armedStart =
    armedSegment && suggestedStart !== null ? (draftStarts[armedSegment.id] ?? suggestedStart) : null
  const roundedCurrentTime = roundToTenths(currentTime)
  const canMarkEnd = armedStart !== null && roundedCurrentTime > armedStart && roundedCurrentTime <= duration
  const invalidatedFutureMappings =
    resolvedArmedIndex !== null && armedStart !== null && roundedCurrentTime > armedStart
      ? segments.slice(resolvedArmedIndex + 1).filter(s => {
          const mapping = mappingMap.get(s.id)
          return !!mapping && mapping.audioStart < roundedCurrentTime && mapping.audioEnd > armedStart
        })
      : []

  return {
    mappingMap,
    armedIndex: resolvedArmedIndex,
    armedSegment,
    suggestedStart,
    nextMappedStart,
    armedStart,
    canMarkEnd,
    invalidatedFutureMappings,
    willInvalidateFutureMappings: invalidatedFutureMappings.length > 0,
    mappedCount: mappingMap.size,
    allMapped: mappingMap.size === segments.length,
    prevMappedSegments: resolvedArmedIndex !== null ? segments.slice(0, resolvedArmedIndex) : segments,
    nextUnmappedSegments: resolvedArmedIndex !== null ? segments.slice(resolvedArmedIndex + 1) : [],
  }
}

/**
 * Commits the armed segment's mapping at `[armedStart, currentTime]`, dropping any later mapping
 * whose range now overlaps it — those were made against a boundary that just moved, so keeping
 * them would silently leave two segments claiming the same audio.
 */
export function markMappingEnd({
  segments,
  mappings,
  armedIndex,
  armedStart,
  currentTime,
  duration,
}: {
  segments: MappableSegment[]
  mappings: DraftMapping[]
  armedIndex: number | null
  armedStart: number | null
  currentTime: number
  duration: number
}): DraftMapping[] {
  if (armedIndex === null || armedStart === null) return mappings

  const audioEnd = roundToTenths(Math.min(currentTime, duration))
  if (audioEnd <= armedStart) return mappings

  const mappingMap = new Map(mappings.map(m => [m.segmentId, m]))
  const invalidatedIds = new Set(
    segments.slice(armedIndex + 1).filter(s => {
      const mapping = mappingMap.get(s.id)
      return !!mapping && mapping.audioStart < audioEnd && mapping.audioEnd > armedStart
    }).map(s => s.id),
  )
  const newMapping: DraftMapping = {
    segmentId: segments[armedIndex]!.id,
    audioStart: roundToTenths(armedStart),
    audioEnd,
  }

  return [
    ...mappings.filter(m => m.segmentId !== newMapping.segmentId && !invalidatedIds.has(m.segmentId)),
    newMapping,
  ]
}

/** Nudges the armed segment's draft start to the playhead, clamped between the suggested start and just short of the audio's end. */
export function setDraftStart({
  segment,
  suggestedStart,
  currentTime,
  duration,
  draftStarts,
}: {
  segment: MappableSegment | null
  suggestedStart: number | null
  currentTime: number
  duration: number
  draftStarts: Record<string, number>
}): Record<string, number> {
  if (!segment || suggestedStart === null) return draftStarts

  const maxStart = Math.max(suggestedStart, duration - 0.1)
  const nextStart = Math.min(Math.max(roundToTenths(currentTime), suggestedStart), maxStart)
  return { ...draftStarts, [segment.id]: roundToTenths(nextStart) }
}

/** Drops the most recently mapped segment and hands back its start, so undo also rewinds the playhead to right where that mapping began. */
export function undoLastMapping(mappings: DraftMapping[]): { mappings: DraftMapping[]; currentTime: number | null } {
  if (mappings.length === 0) return { mappings, currentTime: null }
  const removed = mappings[mappings.length - 1]!
  return { mappings: mappings.slice(0, -1), currentTime: removed.audioStart }
}

/**
 * The correction half of mapping: after a segment is armed-marked roughly by ear, its boundary can
 * be dragged directly on the waveform to fix it against what's actually visible in the audio. Unlike
 * `markMappingEnd` — which is always extending the *next* unmapped segment and so silently clears
 * whatever later mappings that would now overlap — a drag can target any already-mapped segment, at
 * any position, so a silent cascade would be surprising here. Refused instead, the same policy
 * `segment-picker.tsx` uses for an overlapping text selection: the admin sees why and adjusts,
 * rather than another segment's mapping disappearing out from under them.
 */
export function applyRegionEdit({
  segments,
  mappings,
  segmentId,
  audioStart,
  audioEnd,
  duration,
}: {
  segments: MappableSegment[]
  mappings: DraftMapping[]
  segmentId: string
  audioStart: number
  audioEnd: number
  duration: number
}): { mappings: DraftMapping[]; error: string | null } {
  const index = segments.findIndex(s => s.id === segmentId)
  if (index === -1) return { mappings, error: null }

  const start = roundToTenths(Math.max(0, audioStart))
  const end = roundToTenths(Math.min(duration, audioEnd))
  if (end <= start) return { mappings, error: 'A mapping needs some duration — drag the end past the start.' }

  const mappingMap = new Map(mappings.map(m => [m.segmentId, m]))
  const prevMapping = index > 0 ? mappingMap.get(segments[index - 1]!.id) : undefined
  const nextMapping = index < segments.length - 1 ? mappingMap.get(segments[index + 1]!.id) : undefined

  if (prevMapping && start < prevMapping.audioEnd) {
    return {
      mappings,
      error: `Overlaps the previous segment, which ends at ${formatTimestamp(prevMapping.audioEnd)}.`,
    }
  }
  if (nextMapping && end > nextMapping.audioStart) {
    return {
      mappings,
      error: `Overlaps the next segment, which starts at ${formatTimestamp(nextMapping.audioStart)}.`,
    }
  }

  const updated: DraftMapping = { segmentId, audioStart: start, audioEnd: end }
  return { mappings: [...mappings.filter(m => m.segmentId !== segmentId), updated], error: null }
}
