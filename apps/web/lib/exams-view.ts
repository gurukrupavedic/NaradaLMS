import { isMasteredProficiency, isStartedProficiency, type ProficiencyLevel } from '@/lib/proficiency'
import { isCertificationChapter, trackLabel } from '@/lib/dashboard-view'
import type { ApiExam, ApiTrack } from '@/lib/types'

export type CertificationRow = {
  trackId: string
  trackOrder: number
  track: string
  chapterId: string
  chapterCode: string
  // null when the student has never been marked on this track's certification chapter.
  level: ProficiencyLevel | null
  evaluatedAt: string | null
}

export type CertificationSummary = {
  certified: number
  mastered: number
  total: number
}

// Every track's certification chapter, in track order, whether or not this student has reached
// it. Showing the untouched ones is the point: it's the shape of the whole programme, which
// "No completed exams yet" never conveyed.
export function buildCertificationRecord(
  tracks: ApiTrack[],
  markByChapterId: Map<string, { level: ProficiencyLevel; evaluatedAt: string | null }>,
): CertificationRow[] {
  return [...tracks]
    .sort((a, b) => a.order - b.order)
    .flatMap(track => {
      const chapter = track.chapters.find(isCertificationChapter)
      if (!chapter) return []

      const mark = markByChapterId.get(chapter.id)
      return {
        trackId: track.id,
        trackOrder: track.order,
        track: trackLabel(track.order, track.name),
        chapterId: chapter.id,
        chapterCode: chapter.code,
        level: mark?.level ?? null,
        evaluatedAt: mark?.evaluatedAt ?? null,
      }
    })
}

export function isCertified(row: CertificationRow): boolean {
  return row.level !== null && isStartedProficiency(row.level)
}

export function summarizeCertifications(rows: CertificationRow[]): CertificationSummary {
  return {
    certified: rows.filter(isCertified).length,
    mastered: rows.filter(row => row.level !== null && isMasteredProficiency(row.level)).length,
    total: rows.length,
  }
}

export type ExamGroups = {
  scheduled: ApiExam[]
  completed: ApiExam[]
}

// The `exam` table holds scheduled sittings and is separate from the certification chapters
// above — it is currently empty in production, so both of these routinely come back empty and
// their sections are omitted rather than rendered as "nothing here".
export function groupExams(exams: ApiExam[]): ExamGroups {
  return {
    scheduled: exams
      .filter(exam => exam.status === 'scheduled' || exam.status === 'inProgress')
      .sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime()),
    completed: exams
      .filter(exam => exam.status === 'completed')
      .sort((a, b) => new Date(b.scheduledAt).getTime() - new Date(a.scheduledAt).getTime()),
  }
}
