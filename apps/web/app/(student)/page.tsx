import { cookies } from 'next/headers'
import type { ReactNode } from 'react'

import { type ProficiencyLevel } from '@/lib/proficiency'
import { PROFICIENCY_LEVELS, getProficiencyConfig } from '@/lib/proficiency'
import { AppShell, type NavigationItem } from '@/components/app-shell'
import { type ChapterData } from '@/components/track-card'
import { BatchSection } from '@/components/batch-section'
import { ProficiencyBadge } from '@/components/proficiency-badge'
import { StudentHistoryContent } from '@/components/teacher/student-history-content'
import { TeachingBatchSection } from '@/components/teacher/teaching-batch-section'
import { PROFILE_COOKIE } from '@/lib/constants'
import { getDashboardData } from '@/lib/dashboard'
import { getNextOccurrence } from '@/lib/schedule'
import { getCurrentProfile } from '@/lib/session'
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
import {
  BookOpenIcon,
  HouseIcon,
  UsersIcon,
  BookmarkSimpleIcon,
  VideoCameraIcon,
  ArrowSquareOutIcon,
  ClockIcon,
  ExamIcon,
} from '@/components/ui/icons'

const CONTINUE_COOKIE = 'narada-continue-chapter'

// ── Nav ──────────────────────────────────────────────────────────────────────

const navItems: NavigationItem[] = [
  { label: 'Dashboard', icon: HouseIcon },
  { label: 'Learning', icon: BookOpenIcon },
  { label: 'Batches', icon: UsersIcon },
]

// ── Helpers ──────────────────────────────────────────────────────────────────

type ChapterWithTrackName = ApiChapter & { trackName: string }

function buildChapterMap(tracks: ApiTrack[]): Map<string, ChapterWithTrackName> {
  const map = new Map<string, ChapterWithTrackName>()
  for (const track of tracks) {
    for (const chapter of track.chapters) {
      map.set(chapter.id, { ...chapter, trackName: track.name })
    }
  }
  return map
}

// Evaluations arrive DESC; first occurrence per chapterId = most recent
function buildProficiencyMap(
  evaluations: ApiEvaluation[],
): Map<string, { level: ProficiencyLevel; evaluatedAt: string | null }> {
  const map = new Map<string, { level: ProficiencyLevel; evaluatedAt: string | null }>()
  for (const ev of evaluations) {
    if (!map.has(ev.chapterId)) {
      map.set(ev.chapterId, { level: ev.level, evaluatedAt: ev.evaluatedAt })
    }
  }
  return map
}

function buildChapterData(
  chapters: ApiChapter[],
  profMap: Map<string, { level: ProficiencyLevel; evaluatedAt: string | null }>,
): ChapterData[] {
  return chapters.map(ch => {
    const prof = profMap.get(ch.id)
    return {
      id: ch.id,
      code: ch.code,
      title: ch.title,
      proficiency: prof?.level ?? 'notStarted',
      evaluatedAt: prof?.evaluatedAt ? formatDate(prof.evaluatedAt) : undefined,
    }
  })
}

type NextClass = { batch: ApiBatchDetail; occursAt: Date | null }

function findNextClass(batches: ApiBatchDetail[], now: Date): NextClass | null {
  const eligible = batches.filter(b => b.status === 'active' && b.meetingUrl !== null)

  const scheduled = eligible
    .map(batch => ({ batch, occursAt: getNextOccurrence(batch.classSlots, now) }))
    .filter((entry): entry is { batch: ApiBatchDetail; occursAt: Date } => entry.occursAt !== null)

  if (scheduled.length > 0) {
    return scheduled.reduce((soonest, entry) => (entry.occursAt < soonest.occursAt ? entry : soonest))
  }

  // No eligible batch has a schedule set yet — fall back to the join link alone, no time shown.
  const first = eligible[0]
  return first ? { batch: first, occursAt: null } : null
}

function findFirstPracticingChapter(
  batches: ApiBatch[],
  trackMap: Map<string, ApiTrack>,
  profMap: Map<string, { level: ProficiencyLevel; evaluatedAt: string | null }>,
): { chapter: ChapterWithTrackName; batch: ApiBatch } | null {
  for (const batch of batches) {
    if (batch.status !== 'active') continue
    const track = trackMap.get(batch.trackId)
    if (!track) continue
    for (const chapter of track.chapters) {
      if (profMap.get(chapter.id)?.level === 'practicing') {
        return { chapter: { ...chapter, trackName: track.name }, batch }
      }
    }
  }
  return null
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
        pastBatches={getPastBatches(
          pastBatchesByStudentId.get(student.id) ?? [],
          trackMap,
          batchId,
        )}
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

  const cookieStore = await cookies()
  const savedChapterId = cookieStore.get(CONTINUE_COOKIE)?.value
  const myProfileId = cookieStore.get(PROFILE_COOKIE)?.value

  const [dashboard, profile] = await Promise.all([
    getDashboardData(myProfileId),
    getCurrentProfile(),
  ])
  const {
    firstName,
    memberships,
    tracks,
    studentEvaluations,
    upcomingExams,
    teachingByBatchId,
    pastBatchesByStudentId,
  } = dashboard
  // "Your batches" is a personal view — a school-wide admin/owner sees every batch in `memberships`
  // (role === null there), but that belongs on an org-wide admin view, not mixed into this page's
  // per-batch progress/schedule widgets, which assume a real personal enrollment.
  const personalMemberships = memberships.filter(item => item.role !== null)
  const batches = personalMemberships.map(item => item.batch)
  const roleByBatchId = new Map<string, EnrollmentRole>(
    personalMemberships.map(item => [item.batch.id, item.role as EnrollmentRole]),
  )

  const chapterMap = buildChapterMap(tracks)
  const trackMap = new Map(tracks.map(t => [t.id, t]))
  const profMap = buildProficiencyMap(studentEvaluations)

  // "Continue" target: cookie chapter → first practicing chapter
  const savedChapter = savedChapterId ? chapterMap.get(savedChapterId) : undefined
  const savedBatch = savedChapter
    ? batches.find(b => b.trackId === savedChapter.trackId)
    : undefined
  const continueTarget =
    savedChapter && savedBatch
      ? { chapter: savedChapter, batch: savedBatch }
      : findFirstPracticingChapter(batches, trackMap, profMap)

  const nextClass = findNextClass(batches, new Date())
  const nextClassTrack = nextClass ? trackMap.get(nextClass.batch.trackId) : null

  const recentEvals = studentEvaluations.slice(0, 4)

  return (
    <AppShell navigationItems={navItems} profile={profile}>
      {/* ── Page header ──────────────────────────────────────────────────── */}
      <div className="relative overflow-hidden border-b border-border px-4 py-12">
        <span
          aria-hidden
          className="pointer-events-none absolute -right-8 -top-4 select-none font-serif leading-none text-foreground/4"
          style={{ fontSize: '18rem' }}
        >
          ॐ
        </span>
        <div className="relative mx-auto max-w-5xl">
          <p className="mb-3 text-xs uppercase tracking-widest text-muted-foreground">
            Your progress
          </p>
          <h1 className="font-serif text-5xl font-semibold leading-tight tracking-tight">
            Welcome back,
            <br />
            {firstName}.
          </h1>
        </div>
      </div>

      {/* ── Main content ─────────────────────────────────────────────────── */}
      <div className="mx-auto max-w-5xl space-y-10 px-4 py-10">
        {/* Continue learning — full-width hero */}
        {continueTarget && (
          <div className="border-l-2 border-primary bg-primary/5 p-6 ring-1 ring-primary/20">
            <div className="mb-4 flex items-center gap-2">
              <BookmarkSimpleIcon className="size-3.5 text-primary" />
              <p className="text-xs uppercase tracking-widest text-muted-foreground">
                Continue learning
              </p>
            </div>
            <div className="flex items-start justify-between gap-6">
              <div className="min-w-0">
                <p className="text-base font-semibold leading-snug">
                  {continueTarget.chapter.title}
                </p>
                <p className="mt-2 text-xs uppercase tracking-wider text-muted-foreground">
                  Chapter {continueTarget.chapter.code}&ensp;·&ensp;
                  {continueTarget.batch.code}&ensp;·&ensp;
                  {continueTarget.chapter.trackName}
                </p>
              </div>
              <ProficiencyBadge
                level={profMap.get(continueTarget.chapter.id)?.level ?? 'notStarted'}
              />
            </div>
          </div>
        )}

        {/* Recent evaluations (left) + schedule sidebar (right) */}
        <div className="grid gap-4 md:grid-cols-2">
          {/* Recent evaluations */}
          <div className="bg-card overflow-hidden ring-1 ring-foreground/10">
            <div className="flex items-center gap-2 border-b border-border/50 px-4 py-3">
              <ClockIcon className="size-3.5 text-muted-foreground" />
              <p className="text-xs uppercase tracking-wider text-muted-foreground">
                Recent evaluations
              </p>
            </div>
            <div className="divide-y divide-border/30">
              {recentEvals.length === 0 && (
                <p className="px-4 py-3 text-xs text-muted-foreground">No evaluations yet.</p>
              )}
              {recentEvals.map(ev => {
                const chapter = chapterMap.get(ev.chapterId)
                const batchCode = batches.find(b => b.trackId === chapter?.trackId)?.code
                return (
                  <div key={ev.id} className="flex items-center gap-3 px-4 py-3">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">
                        {chapter?.title ?? ev.chapterId}
                      </p>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {batchCode}&ensp;·&ensp;
                        {ev.evaluatedAt ? formatDate(ev.evaluatedAt) : '—'}
                      </p>
                    </div>
                    <ProficiencyBadge level={ev.level} compact />
                  </div>
                )
              })}
            </div>
          </div>

          {/* Schedule sidebar: next class + upcoming exams */}
          <div className="space-y-4">
            {nextClass && nextClassTrack && (
              <div className="bg-card overflow-hidden ring-1 ring-foreground/10">
                <div className="flex items-center gap-2 border-b border-border/50 px-4 py-3">
                  <VideoCameraIcon className="size-3.5 text-muted-foreground" />
                  <p className="text-xs uppercase tracking-wider text-muted-foreground">
                    Next class
                  </p>
                </div>
                <div className="p-4">
                  <p className="mb-0.5 text-sm font-medium">{nextClass.batch.code}</p>
                  <p className="mb-4 text-xs text-muted-foreground">Track {nextClassTrack.order}</p>
                  <div className="flex items-center justify-between gap-3">
                    {nextClass.occursAt ? (
                      <p className="text-xs text-muted-foreground">
                        {formatDate(nextClass.occursAt)}&ensp;·&ensp;{formatTime(nextClass.occursAt)}
                      </p>
                    ) : (
                      <span />
                    )}
                    <a
                      href={nextClass.batch.meetingUrl!}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
                    >
                      Join
                      <ArrowSquareOutIcon className="size-3" />
                    </a>
                  </div>
                </div>
              </div>
            )}

            {upcomingExams.length > 0 && (
              <div className="bg-card overflow-hidden ring-1 ring-foreground/10">
                <div className="flex items-center gap-2 border-b border-border/50 px-4 py-3">
                  <ExamIcon className="size-3.5 text-muted-foreground" />
                  <p className="text-xs uppercase tracking-wider text-muted-foreground">
                    Upcoming exams
                  </p>
                </div>
                <div className="divide-y divide-border/30">
                  {upcomingExams.map(exam => {
                    const chapter = chapterMap.get(exam.chapterId)
                    const track = chapter ? trackMap.get(chapter.trackId) : null
                    return (
                      <div
                        key={exam.id}
                        className="flex items-center justify-between gap-3 px-4 py-3"
                      >
                        <div className="min-w-0">
                          <p className="text-sm font-medium">Track {track?.order ?? '—'}</p>
                          <p className="mt-0.5 truncate text-xs text-muted-foreground">
                            {track?.name ?? '—'}
                          </p>
                        </div>
                        <div className="shrink-0 text-right text-xs text-muted-foreground">
                          <p>{formatDate(exam.scheduledAt)}</p>
                          <p>{formatTime(exam.scheduledAt)}</p>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Your batches */}
        <div className="space-y-6">
          <div className="flex items-center gap-4">
            <h2 className="shrink-0 font-serif text-2xl font-semibold">Your batches</h2>
            <div className="h-px flex-1 bg-border" />
          </div>
          <div className="space-y-4">
            {batches.map(batch => {
              const track = trackMap.get(batch.trackId)
              if (!track) return null

              const role = roleByBatchId.get(batch.id)
              if (role && role !== 'student') {
                const taught = teachingByBatchId.get(batch.id)
                if (!taught) return null

                const students = batch.members
                  .filter(member => member.role === 'student')
                  .map(toRosterStudent)
                const evaluatorNameById = new Map(
                  batch.members.map(member => [member.profileId, member.name]),
                )

                return (
                  <TeachingBatchSection
                    key={batch.id}
                    batchId={batch.id}
                    batchCode={batch.code}
                    status={batch.status}
                    trackName={track.name}
                    trackOrder={track.order}
                    progress={getTaughtBatchProgress(taught.evaluations, track.chapters, students)}
                    role={role}
                    chapters={track.chapters}
                    roster={buildTeachingRoster(track.chapters, taught.evaluations, students)}
                    historyContentByStudentId={buildHistoryContentByStudentId(
                      batch.id,
                      track.chapters,
                      taught.evaluations,
                      students,
                      evaluatorNameById,
                      pastBatchesByStudentId,
                      trackMap,
                    )}
                    defaultOpen={batch.id === activeBatchId}
                  />
                )
              }

              const chapterData = buildChapterData(track.chapters, profMap)
              return (
                <BatchSection
                  key={batch.id}
                  batchCode={batch.code}
                  batchStatus={batch.status}
                  startDate={batch.startDate}
                  trackOrder={track.order}
                  trackName={track.name}
                  chapters={chapterData}
                />
              )
            })}
          </div>
        </div>

        {/* Proficiency legend */}
        <div className="space-y-3 border-t border-border/50 pt-6">
          <p className="text-xs uppercase tracking-widest text-muted-foreground">
            Proficiency levels
          </p>
          <div className="flex flex-wrap gap-3">
            {PROFICIENCY_LEVELS.filter(l => l !== 'absent').map(level => {
              const config = getProficiencyConfig(level)
              return (
                <div key={level} className="flex items-center gap-1.5">
                  <ProficiencyBadge level={level} compact />
                  <span className="text-xs text-muted-foreground">{config.label}</span>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </AppShell>
  )
}
