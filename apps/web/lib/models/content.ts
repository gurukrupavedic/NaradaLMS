import type { ProficiencyLevel } from '@/lib/proficiency'

/**
 * The practice room's content types and pure helpers.
 *
 * `lib/api/reshape.ts`'s `buildChapterContent` builds this from real data — real chapter, real track, real proficiency, real scripts/audio when
 * a chapter has them. Today no chapter in the imported syllabus actually has any (text, segments or
 * audio), so `scripts`/`audio` come back empty in practice — but the capability is real:
 * apps/api's chapters domain persists all three and `components/admin/*` writes them for real.
 * `components/practice-room.tsx` renders an honest empty state for the no-content case rather than
 * pretending otherwise.
 *
 * The shapes below are what a chapter's content *would* be once a chapter has any: text,
 * `segments` addressed as character offsets into that text, and `audio` assets whose `mappings`
 * tie a segment id to a time range in the recording. One deliberate extension over a single
 * `script` per chapter: a student reading Devanagari and a student reading Telugu are looking at
 * the *same* recitation, so scripts are modelled as parallel texts sharing one set of segment ids
 * — which is what lets the audio mapping stay valid across a script switch.
 */

export type ScriptKey = 'sa' | 'te' | 'en'

export type Segment = { id: string; start: number; end: number }

export type ScriptText = {
  key: ScriptKey
  label: string
  short: string
  fontClass: string
  text: string
  segments: Segment[]
}

export type AudioMapping = { segmentId: string; audioStart: number; audioEnd: number }

export type AudioAsset = {
  id: string
  label: string
  reciter: string
  duration: number
  // Signed R2 download URL, valid for a limited time — resolved fresh on every chapter fetch, never
  // cached across requests.
  url: string
  mappings: AudioMapping[]
}

export type ChapterContent = {
  id: string
  code: string
  title: string
  trackId: string
  trackName: string
  level: ProficiencyLevel
  evaluatedAt: string | null
  scripts: ScriptText[]
  audio: AudioAsset[]
}

/**
 * Which segment is sounding at time `t`. Linear scan: a long chapter is still in the low hundreds
 * of segments — a binary search would be faster on paper and slower to read for no measurable gain
 * at this size.
 */
export function segmentAt(mappings: AudioMapping[], t: number): string | null {
  for (const m of mappings) {
    if (t >= m.audioStart && t < m.audioEnd) return m.segmentId
  }
  return null
}

export function mappingFor(mappings: AudioMapping[], segmentId: string): AudioMapping | null {
  return mappings.find(m => m.segmentId === segmentId) ?? null
}

export function formatClock(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds))
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
}
