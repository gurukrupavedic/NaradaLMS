/**
 * Real-data → presentation-shape transforms for the fetchers in `resources.ts`.
 *
 * This is the reshaping apps/web's own `lib/dashboard-view.ts` already solves for the live app —
 * adapted here to `web-next`'s presentation types (`LadderTrack`/`TeachingBatch`/
 * `RosterStudent`, from `components/track-ladder.tsx` / `lib/mock-dashboard.ts`), which differ
 * from apps/web's own (e.g. this workspace's dashboard renders a full roster mark-book inline,
 * where apps/web's dashboard only shows a summary card). Concepts and formulas are ported
 * directly where the shapes match (progress percentages); the roster/mark-book construction below
 * has no apps/web equivalent to port, since apps/web doesn't inline a roster on its dashboard.
 *
 * A track's certification result used to be detected by a title regex against a fake "TRACK N
 * CERTIFICATION..." chapter — that chapter never really belonged in the syllabus, and a real
 * import (`tools/src/parse-excel-to-json.ts`) no longer produces it: certifications now come back
 * as their own rows (`ApiDashboard.certifications`, backed by `packages/db`'s dedicated
 * `trackCertification` table), so there's nothing left to detect by title.
 */

import {
  countMastered,
  countStarted,
  getMasteredProgress,
  getProficiencyProgress,
  isMastered,
  type ProficiencyLevel,
} from '@/lib/proficiency'
import type { ChapterRow, LadderTrack } from '@/components/track-ladder'
import type { CertificationRow, RosterStudent, TeachingBatch } from '@/lib/mock-dashboard'
import { EMPTY, type CatalogChapter, type CatalogTrack } from '@/lib/mock-catalog'
import type { ChapterContent } from '@/lib/mock-content'
import type {
  ApiBatchWithRole,
  ApiChapter,
  ApiChapterDetail,
  ApiDashboard,
  ApiEvaluation,
  ApiProficiencyLevel,
  ApiTrack,
  ApiStudentExamResult,
} from '@/lib/api/api-types'

// The backend enum (packages/db/src/schema/school.ts) still carries `practicing` — the importer's
// fallback for a spreadsheet score that parsed as a positive number but not 1–4 — even though the
// UI scale (`lib/proficiency.ts`) has dropped it as a rung nobody actually lands on: a live count
// against every `evaluation`/`trackCertification` row turned up zero of them. Narrowed here, at the
// one seam between the wire type and the UI type, rather than letting `practicing` leak into a
// `ProficiencyLevel` slot the palette/labels no longer have a colour or a name for.
export function narrowLevel(level: ApiProficiencyLevel): ProficiencyLevel {
  return level === 'practicing' ? 'level0' : level
}

/** Latest graded exam per track — same "history, not a single mutable mark" shape as evaluations. A track's certification is this. */
export function latestExamResultByTrackId(
  results: ApiStudentExamResult[],
): Map<string, ApiStudentExamResult> {
  const byTrack = new Map<string, ApiStudentExamResult>()
  for (const result of results) {
    const existing = byTrack.get(result.trackId)
    if (!existing || result.evaluatedAt > existing.evaluatedAt) {
      byTrack.set(result.trackId, result)
    }
  }
  return byTrack
}

function latestLevelByChapterId(
  evaluations: ApiEvaluation[],
): Map<string, { level: ProficiencyLevel; evaluatedAt: string | null }> {
  const byChapter = new Map<string, { level: ProficiencyLevel; evaluatedAt: string | null }>()
  for (const evaluation of evaluations) {
    const existing = byChapter.get(evaluation.chapterId)
    // Evaluations are append-only history, not a single mutable mark — several can exist for the
    // same chapter over time, and only the most recent one is "the" current level.
    if (!existing || (evaluation.evaluatedAt ?? '') > (existing.evaluatedAt ?? '')) {
      byChapter.set(evaluation.chapterId, {
        level: narrowLevel(evaluation.level),
        evaluatedAt: evaluation.evaluatedAt,
      })
    }
  }
  return byChapter
}

function buildChapterRows(
  chapters: ApiChapter[],
  levelByChapterId: Map<string, { level: ProficiencyLevel; evaluatedAt: string | null }>,
): ChapterRow[] {
  return [...chapters]
    .sort((a, b) => a.order - b.order)
    .map(chapter => {
      const mark = levelByChapterId.get(chapter.id)
      return {
        id: chapter.id,
        code: chapter.code,
        title: chapter.title,
        level: mark?.level ?? 'notStarted',
        evaluatedAt: mark?.evaluatedAt ?? null,
        // No chapter in the imported syllabus has text/audio uploaded yet (see the field's own
        // doc comment on ChapterRow) — real for every track today, not a placeholder.
        hasContent: false,
      }
    })
}

/**
 * One learner's ladder for one track: the track's published chapters, each chapter's most recent
 * evaluation level, and the batch (if any) the student sits in for it.
 */
export function buildLadderTrack(
  track: ApiTrack,
  evaluations: ApiEvaluation[],
  membership: ApiBatchWithRole | undefined,
): LadderTrack {
  const chapters = buildChapterRows(track.chapters, latestLevelByChapterId(evaluations))
  const levels = chapters.map(c => c.level)

  return {
    id: track.id,
    name: track.name,
    order: track.order,
    batchId: membership?.id ?? null,
    batchCode: membership?.code ?? null,
    batchStatus: membership?.status ?? null,
    chapters,
    started: countStarted(levels),
    mastered: countMastered(levels),
    total: levels.length,
    progress: getProficiencyProgress(levels),
    masteredProgress: getMasteredProgress(levels),
  }
}

/**
 * Every one of a dashboard's tracks with real chapters, as ladders — the same construction
 * `fetchDashboard` (self) and `fetchProfileDetail` (any viewable profile) both need, extracted so
 * neither re-derives it independently. A track with no chapters isn't real curriculum (see
 * `buildCatalogTrack`'s doc comment on the "Graduated" synthetic bucket), so it's filtered here,
 * once, for every caller.
 */
export function buildLearningTracks(dashboard: ApiDashboard): LadderTrack[] {
  const membershipByTrackId = new Map(dashboard.memberships.map(m => [m.trackId, m]))
  return dashboard.tracks
    .filter(track => track.chapters.length > 0)
    .map(track => buildLadderTrack(track, dashboard.studentEvaluations, membershipByTrackId.get(track.id)))
}

/** Every one of a dashboard's tracks as a certification-record row — see `buildLearningTracks`'s doc comment on why this is shared rather than re-derived per caller. */
export function buildCertificationRows(dashboard: ApiDashboard): CertificationRow[] {
  const resultByTrackId = latestExamResultByTrackId(dashboard.examResults)
  return dashboard.tracks
    .filter(track => track.chapters.length > 0)
    .map(track => {
      const result = resultByTrackId.get(track.id)
      return {
        track: track.name,
        level: result?.level ? narrowLevel(result.level) : 'notStarted',
        outcome: result?.outcome ?? null,
        total: result?.total ?? null,
        awardedAt: result?.evaluatedAt ?? null,
      }
    })
}

/**
 * The practice room's own view of one chapter: real title, real track, real proficiency (from the
 * dashboard aggregate, the one place a chapter's track and this student's progress on it are
 * already joined), and real scripts/audio (from `detail`, the standalone `GET /chapters/:id` this
 * chapter's own content lives behind — `resources.ts`'s `fetchChapter` fetches both and passes
 * them in together).
 *
 * `detail.scripts`/`.audio` already match `ChapterContent`'s own `ScriptText[]`/`AudioAsset[]`
 * field-for-field (that shape was designed first, against exactly this API contract), so this is a
 * pass-through map, not a real transform.
 */
export function buildChapterContent(
  dashboard: ApiDashboard,
  chapter: ApiChapter,
  detail: ApiChapterDetail,
): ChapterContent {
  const track = dashboard.tracks.find(t => t.id === chapter.trackId)
  const mark = latestLevelByChapterId(dashboard.studentEvaluations).get(chapter.id)

  return {
    id: chapter.id,
    code: chapter.code,
    title: chapter.title,
    trackId: chapter.trackId,
    trackName: track?.name ?? '',
    level: mark?.level ?? 'notStarted',
    evaluatedAt: mark?.evaluatedAt ?? null,
    scripts: detail.scripts.map(s => ({
      key: s.key,
      label: s.label,
      short: s.short,
      fontClass: s.fontClass,
      text: s.text,
      segments: s.segments,
    })),
    audio: detail.audio.map(a => ({
      id: a.id,
      label: a.label ?? '',
      reciter: a.reciter,
      duration: a.duration,
      url: a.url,
      mappings: a.mappings,
    })),
  }
}

/** The earliest chapter (in track order) that isn't mastered yet — null once the whole track is. */
export function findResumeChapterId(track: LadderTrack): string | null {
  return track.chapters.find(chapter => !isMastered(chapter.level))?.id ?? null
}

/**
 * An admin's view of one track: drafts included, no student's progress on it — the same real
 * `ApiTrack` `buildLadderTrack` reads above, reshaped for `lib/mock-catalog.ts`'s admin-catalog
 * types instead of the reader's `LadderTrack`.
 *
 * Two things this workspace's fixture catalog had that no real field backs: `subtitle` (left
 * unset — see `CatalogTrack`'s own doc comment) and `isCertification` (always `false` — a chapter
 * hasn't been able to *be* the certification since the real import stopped emitting a fake "TRACK N
 * CERTIFICATION" chapter for it; see this file's header comment). Neither is a placeholder pretending
 * to be real data — they're the actual, current, honest values.
 */
export function buildCatalogTrack(track: ApiTrack, batchCodes: string[]): CatalogTrack {
  const chapters: CatalogChapter[] = [...track.chapters]
    .sort((a, b) => a.order - b.order)
    .map(chapter => ({
      id: chapter.id,
      code: chapter.code,
      title: chapter.title,
      status: chapter.status,
      isCertification: false,
      content: { ...EMPTY, script: chapter.script },
    }))

  return {
    id: track.id,
    name: track.name,
    order: track.order,
    batchCodes,
    chapters,
  }
}

/**
 * A batch's roster as a mark-book: each student's level per chapter in the batch's track, and
 * which chapter they were most recently evaluated on (`current`; null means never evaluated —
 * `web-next`'s "unevaluated" signal, see `components/mark-book.tsx`).
 */
export function buildRoster(
  membership: ApiBatchWithRole,
  trackChapters: ApiChapter[],
  teachingEvaluations: ApiEvaluation[],
): RosterStudent[] {
  const orderedChapters = [...trackChapters].sort((a, b) => a.order - b.order)
  // A student put on a break (mark-book.tsx's "Mark on break" row action) keeps their `enrollment`
  // row — see apps/api/src/enrollment/service.ts's `putOnBreak` doc comment — so this is the one
  // place that has to filter them back out: everything downstream of `buildRoster` (both the
  // admin batch-detail grid and the teacher's own dashboard) only ever sees this function's
  // output, so a student stops showing up here the moment their status isn't 'active' anymore.
  const students = membership.members.filter(
    member => member.role === 'student' && member.status === 'active',
  )

  return students.map(student => {
    const byChapter = latestLevelByChapterId(
      teachingEvaluations.filter(evaluation => evaluation.studentId === student.profileId),
    )

    const marks = orderedChapters.map(chapter => byChapter.get(chapter.id)?.level ?? 'notStarted')

    let current: string | null = null
    let latestEvaluatedAt = ''
    for (const chapter of orderedChapters) {
      const mark = byChapter.get(chapter.id)
      if (mark?.evaluatedAt && mark.evaluatedAt > latestEvaluatedAt) {
        latestEvaluatedAt = mark.evaluatedAt
        current = chapter.code
      }
    }

    return { id: student.profileId, name: student.name, city: student.city, marks, current }
  })
}

export function buildTeachingBatch(
  membership: ApiBatchWithRole,
  trackName: string,
  trackChapters: ApiChapter[],
  teachingEvaluations: ApiEvaluation[],
): TeachingBatch | null {
  if (membership.role !== 'instructor' && membership.role !== 'ta') {
    return null
  }
  // TeachingBatch.status is only ever active/completed — a batch a caller teaches that hasn't
  // started yet has no marks to show, so it isn't part of the teaching panel at all.
  if (membership.status === 'upcoming') {
    return null
  }

  const orderedChapters = [...trackChapters].sort((a, b) => a.order - b.order)
  const students = buildRoster(membership, trackChapters, teachingEvaluations)
  const allMarks = students.flatMap(student => student.marks)

  return {
    batchId: membership.id,
    batchCode: membership.code,
    track: trackName,
    role: membership.role,
    status: membership.status,
    chapterCodes: orderedChapters.map(chapter => chapter.code),
    chapterIds: orderedChapters.map(chapter => chapter.id),
    chapterTitles: orderedChapters.map(chapter => chapter.title),
    students,
    unevaluatedCount: students.filter(student => student.current === null).length,
    progress: getProficiencyProgress(allMarks),
    masteredProgress: getMasteredProgress(allMarks),
  }
}

/**
 * When the active batch next meets, from its recurring weekly `classSlots` — the soonest slot
 * from now, this week or next. Returns null when the batch has no schedule set (real for most of
 * the imported data — recurring schedules are a new capability with little back-filled data yet).
 */
export function findNextClass(
  membership: ApiBatchWithRole | undefined,
): { batchCode: string; when: string; meetingUrl: string | null } | null {
  if (!membership || membership.classSlots.length === 0) {
    return null
  }

  const now = new Date()
  let soonest: Date | null = null

  for (const slot of membership.classSlots) {
    const [hours, minutes] = slot.time.split(':').map(Number)
    for (const weekOffset of [0, 1]) {
      const candidate = new Date(now)
      candidate.setDate(now.getDate() + ((slot.dayOfWeek - now.getDay() + 7) % 7) + weekOffset * 7)
      candidate.setHours(hours ?? 0, minutes ?? 0, 0, 0)
      if (candidate >= now && (!soonest || candidate < soonest)) {
        soonest = candidate
      }
    }
  }

  if (!soonest) {
    return null
  }

  return {
    batchCode: membership.code,
    // Raw ISO, same as every other scheduled-time field this app carries — formatting is the
    // caller's job now (`components/timestamp.tsx`'s `<Timestamp variant="dateTime">`), not this
    // function's.
    when: soonest.toISOString(),
    meetingUrl: membership.meetingUrl,
  }
}
