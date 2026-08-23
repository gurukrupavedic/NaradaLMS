import type { ReactNode } from 'react'

import { AppShell } from '@/components/app-shell'
import { getNavItems } from '@/lib/nav-items'
import { Standing } from '@/components/dashboard/standing'
import { Archive, Section } from '@/components/dashboard/section'
import { LevelKey, TrackLadder } from '@/components/dashboard/track-ladder'
import { TeachingList, type TeachingRowData } from '@/components/dashboard/teaching-list'
import { StudentHistoryContent } from '@/components/teacher/student-history-content'
import { getDashboardData } from '@/lib/dashboard'
import { getNextOccurrence } from '@/lib/schedule'
import { getCurrentProfile, hasSchoolWideAccess } from '@/lib/session'
import { type ProficiencyLevel } from '@/lib/proficiency'
import {
  buildChapterRows,
  buildDashboardShape,
  countUnevaluatedStudents,
  findResumeChapter,
  pluralize,
  summarizeLearningTrack,
  trackLabel,
  type LearningTrack,
} from '@/lib/dashboard-view'
import {
  getBatchProgress as getTaughtBatchProgress,
  getChapterLevel,
  getCurrentChapter,
  getLatestEvaluation,
  getPastBatches,
  getStudentEvaluationHistory,
  toRosterStudent,
  type RosterStudent,
  type RosterRow,
} from '@/lib/roster'
import {
  type ApiBatch,
  type ApiBatchDetail,
  type ApiChapter,
  type ApiEvaluation,
  type ApiTrack,
  type EnrollmentRole,
} from '@/lib/types'
import { ArrowSquareOutIcon, VideoCameraIcon } from '@/components/ui/icons'

// ── Helpers ──────────────────────────────────────────────────────────────────

function buildProficiencyMap(
  evaluations: ApiEvaluation[],
): Map<string, { level: ProficiencyLevel; evaluatedAt: string | null }> {
  // Evaluations arrive DESC; first occurrence per chapterId is the most recent.
  const map = new Map<string, { level: ProficiencyLevel; evaluatedAt: string | null }>()
  for (const evaluation of evaluations) {
    if (!map.has(evaluation.chapterId)) {
      map.set(evaluation.chapterId, {
        level: evaluation.level,
        evaluatedAt: evaluation.evaluatedAt ? formatDate(evaluation.evaluatedAt) : null,
      })
    }
  }
  return map
}

function formatDate(value: string | Date): string {
  return new Date(value).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

function formatTime(value: string | Date): string {
  return new Date(value).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
}

type NextClass = { batch: ApiBatchDetail; occursAt: Date | null }

function findNextClass(batches: ApiBatchDetail[], now: Date): NextClass | null {
  const eligible = batches.filter(batch => batch.status === 'active' && batch.meetingUrl !== null)

  const scheduled = eligible
    .map(batch => ({ batch, occursAt: getNextOccurrence(batch.classSlots, now) }))
    .filter((entry): entry is { batch: ApiBatchDetail; occursAt: Date } => entry.occursAt !== null)

  if (scheduled.length > 0) {
    return scheduled.reduce((soonest, entry) =>
      entry.occursAt < soonest.occursAt ? entry : soonest,
    )
  }

  // No eligible batch has a schedule set yet — fall back to the join link alone, no time shown.
  const first = eligible[0]
  return first ? { batch: first, occursAt: null } : null
}

function buildTeachingRoster(
  chapters: ApiChapter[],
  evaluations: ApiEvaluation[],
  students: RosterStudent[],
): RosterRow[] {
  return students.map(student => ({
    student,
    current: getCurrentChapter(evaluations, chapters, student.id),
    chapterMarks: chapters.map(chapter => ({
      chapter,
      level: getChapterLevel(evaluations, student.id, chapter.id),
      latest: getLatestEvaluation(evaluations, student.id, chapter.id),
    })),
  }))
}

function buildHistoryContentByStudentId(
  batchId: string,
  chapters: ApiChapter[],
  evaluations: ApiEvaluation[],
  students: RosterStudent[],
  evaluatorNameById: Map<string, string>,
  pastBatchesByStudentId: Map<string, ApiBatch[]>,
  trackMap: Map<string, ApiTrack>,
): Record<string, ReactNode> {
  const chapterById = new Map(chapters.map(chapter => [chapter.id, chapter]))
  return Object.fromEntries(
    students.map(student => [
      student.id,
      <StudentHistoryContent
        key={student.id}
        batchId={batchId}
        student={student}
        currentChapter={getCurrentChapter(evaluations, chapters, student.id)}
        historyRows={getStudentEvaluationHistory(evaluations, student.id)}
        chapterById={chapterById}
        evaluatorNameById={evaluatorNameById}
        pastBatches={getPastBatches(pastBatchesByStudentId.get(student.id) ?? [], trackMap, batchId)}
      />,
    ]),
  )
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ batch?: string }>
}) {
  const { batch: activeBatchId } = await searchParams

  const [dashboard, profile, isAdmin] = await Promise.all([
    getDashboardData(),
    getCurrentProfile(),
    hasSchoolWideAccess(),
  ])
  const { firstName, memberships, tracks, studentEvaluations, upcomingExams, teachingByBatchId, pastBatchesByStudentId } =
    dashboard

  // A school-wide admin/owner sees every batch in `memberships` with role === null. Those aren't
  // personal enrollments and belong on the admin view, not in this page's own progress widgets.
  const personalMemberships = memberships.filter(item => item.role !== null)
  const trackMap = new Map(tracks.map(track => [track.id, track]))
  const proficiencyMap = buildProficiencyMap(studentEvaluations)

  const learningTracks: LearningTrack[] = personalMemberships
    .filter(item => item.role === 'student')
    .flatMap(item => {
      const track = trackMap.get(item.batch.trackId)
      if (!track) return []
      return summarizeLearningTrack({
        batchId: item.batch.id,
        batchCode: item.batch.code,
        status: item.batch.status,
        track: trackLabel(track.order, track.name),
        chapters: buildChapterRows(track.chapters, proficiencyMap),
      })
    })

  const teachingBatches: TeachingRowData[] = personalMemberships
    .filter(item => item.role !== null && item.role !== 'student')
    .flatMap(item => {
      const track = trackMap.get(item.batch.trackId)
      const taught = teachingByBatchId.get(item.batch.id)
      if (!track || !taught) return []

      const students = item.batch.members
        .filter(member => member.role === 'student')
        .map(toRosterStudent)
      const progress = getTaughtBatchProgress(taught.evaluations, track.chapters, students)

      return {
        batchId: item.batch.id,
        batchCode: item.batch.code,
        status: item.batch.status,
        track: trackLabel(track.order, track.name),
        role: item.role as EnrollmentRole,
        studentCount: students.length,
        progress: progress.progress,
        masteredProgress: progress.masteredProgress,
        unevaluatedCount: countUnevaluatedStudents(
          students.map(student => student.id),
          taught.evaluations,
        ),
        roster: buildTeachingRoster(track.chapters, taught.evaluations, students),
        historyContentByStudentId: buildHistoryContentByStudentId(
          item.batch.id,
          track.chapters,
          taught.evaluations,
          students,
          new Map(item.batch.members.map(member => [member.profileId, member.name])),
          pastBatchesByStudentId,
          trackMap,
        ),
      }
    })

  const shape = buildDashboardShape(learningTracks, teachingBatches)
  const focusTrack = shape.learning.active[0] ?? null
  const resumeChapter = focusTrack ? findResumeChapter(focusTrack) : null

  const nextClass = findNextClass(
    personalMemberships.map(item => item.batch),
    new Date(),
  )
  const nextClassTrack = nextClass ? trackMap.get(nextClass.batch.trackId) : null

  const learningSection = (shape.learning.active.length > 0 || shape.learning.archived.length > 0) && (
    <Section
      key="learning"
      title="Your learning"
      count={shape.learning.active.length > 0 ? undefined : 'complete'}
    >
      {shape.learning.active.length > 0 && (
        <>
          <LevelKey />
          <div className="space-y-4">
            {shape.learning.active.map(track => (
              <TrackLadder
                key={track.batchId}
                track={track}
                resumeChapterId={track.batchId === focusTrack?.batchId ? resumeChapter?.id : null}
              />
            ))}
          </div>
        </>
      )}

      {shape.learning.archived.length > 0 && (
        <Archive label={`${pluralize(shape.learning.archived.length, 'completed track')}`}>
          <div className="space-y-4">
            {shape.learning.archived.map(track => (
              <TrackLadder key={track.batchId} track={track} defaultOpen={false} />
            ))}
          </div>
        </Archive>
      )}
    </Section>
  )

  const teachingSection = (shape.teaching.active.length > 0 || shape.teaching.archived.length > 0) && (
    <Section
      key="teaching"
      title="Your teaching"
      count={
        shape.teaching.active.length > 0
          ? pluralize(shape.teaching.active.length, 'active batch', 'active batches')
          : undefined
      }
    >
      {shape.teaching.active.length > 0 && (
        <TeachingList batches={shape.teaching.active} defaultOpenBatchId={activeBatchId} />
      )}

      {shape.teaching.archived.length > 0 && (
        <Archive label={`${pluralize(shape.teaching.archived.length, 'completed batch', 'completed batches')}`}>
          <TeachingList batches={shape.teaching.archived} defaultOpenBatchId={activeBatchId} />
        </Archive>
      )}
    </Section>
  )

  const sections =
    shape.lead === 'teaching'
      ? [teachingSection, learningSection]
      : [learningSection, teachingSection]

  return (
    <AppShell navigationItems={getNavItems(isAdmin)} profile={profile}>
      <Standing {...buildStanding({ firstName, shape, resumeChapter, focusTrack })} />

      <div className="mx-auto max-w-5xl space-y-10 px-4 py-8">
        {(nextClass || upcomingExams.length > 0) && (
          <div className="flex flex-wrap items-center gap-x-8 gap-y-3 border-l-2 border-primary bg-primary/5 px-4 py-3">
            {nextClass && nextClassTrack && (
              <div className="flex min-w-0 items-center gap-2.5">
                <VideoCameraIcon className="size-4 shrink-0 text-primary" />
                <span className="text-sm">
                  <span className="font-medium">Next class</span>
                  <span className="text-muted-foreground">
                    {' · '}
                    {nextClass.batch.code}
                    {nextClass.occursAt &&
                      ` · ${formatDate(nextClass.occursAt)}, ${formatTime(nextClass.occursAt)}`}
                  </span>
                </span>
                <a
                  href={nextClass.batch.meetingUrl!}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex shrink-0 items-center gap-1 text-sm font-medium text-primary hover:underline"
                >
                  Join
                  <ArrowSquareOutIcon className="size-3" />
                </a>
              </div>
            )}

            {upcomingExams.map(exam => (
              <span key={exam.id} className="text-sm">
                <span className="font-medium">Exam</span>
                <span className="text-muted-foreground">
                  {' · '}
                  {exam.chapter.title} · {formatDate(exam.scheduledAt)}
                </span>
              </span>
            ))}
          </div>
        )}

        {sections}

        {shape.learning.active.length === 0 &&
          shape.learning.archived.length === 0 &&
          shape.teaching.active.length === 0 &&
          shape.teaching.archived.length === 0 && (
            <p className="text-sm text-muted-foreground">
              You&apos;re not enrolled in any batches yet. Contact your administrator.
            </p>
          )}
      </div>
    </AppShell>
  )
}

// The headline answers whichever question this person actually arrived with — a teacher wants to
// know where their attention is owed, a student wants to know what to practise next.
function buildStanding({
  firstName,
  shape,
  resumeChapter,
  focusTrack,
}: {
  firstName: string
  shape: ReturnType<typeof buildDashboardShape<LearningTrack, TeachingRowData>>
  resumeChapter: ReturnType<typeof findResumeChapter>
  focusTrack: LearningTrack | null
}) {
  if (shape.lead === 'teaching') {
    const active = shape.teaching.active
    const students = active.reduce((sum, batch) => sum + batch.studentCount, 0)
    const waiting = active.reduce((sum, batch) => sum + batch.unevaluatedCount, 0)

    return {
      eyebrow: `${firstName} · teaching`,
      headline: pluralize(active.length, 'active batch', 'active batches'),
      meta: `${pluralize(students, 'student')}${waiting > 0 ? ` · ${waiting} awaiting a first evaluation` : ' · everyone has been evaluated'}`,
      stats: [
        { value: String(active.length), label: 'Batches' },
        { value: String(students), label: 'Students' },
      ],
    }
  }

  if (focusTrack && resumeChapter) {
    return {
      eyebrow: `${firstName} · up next`,
      headline: resumeChapter.title,
      meta: `${focusTrack.track} · chapter ${resumeChapter.code} · ${focusTrack.batchCode}`,
      stats: [
        { value: `${focusTrack.started}/${focusTrack.total}`, label: 'Chapters' },
        { value: String(focusTrack.mastered), label: 'Mastered' },
      ],
    }
  }

  const completed = shape.learning.archived.length
  return {
    eyebrow: `${firstName} · learning`,
    headline: completed > 0 ? 'All tracks complete' : 'Nothing in progress',
    meta:
      completed > 0
        ? `${pluralize(completed, 'completed track')} in your archive`
        : 'You have no active chapters right now.',
    stats: [],
  }
}
