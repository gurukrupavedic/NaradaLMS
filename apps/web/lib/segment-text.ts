/** Parses "start,end" per line into the shape the API expects — the plain-text stand-in for a segment scrubber (not built here, see the plan's own non-goals). */
export function parseSegments(raw: string): { start: number; end: number }[] | null {
  const lines = raw
    .split('\n')
    .map(line => line.trim())
    .filter(line => line.length > 0)
  if (lines.length === 0) return null

  const segments: { start: number; end: number }[] = []
  for (const line of lines) {
    const parts = line.split(',').map(p => p.trim())
    if (parts.length !== 2) return null
    const start = Number(parts[0])
    const end = Number(parts[1])
    if (!Number.isInteger(start) || !Number.isInteger(end)) return null
    segments.push({ start, end })
  }
  return segments
}

export function formatSegments(segments: { start: number; end: number }[]): string {
  return segments.map(s => `${s.start},${s.end}`).join('\n')
}
