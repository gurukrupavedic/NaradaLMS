import { cookies } from 'next/headers'

import { type ProficiencyLevel } from '@/lib/proficiency'
import { PROFICIENCY_LEVELS, getProficiencyConfig } from '@/lib/proficiency'
import { AppShell, type NavigationItem } from '@/components/app-shell'
import { type ChapterData } from '@/components/track-card'
import { BatchSection } from '@/components/batch-section'
import { ProficiencyBadge } from '@/components/proficiency-badge'
import {
  BookOpenIcon,
  HouseIcon,
  CalendarBlankIcon,
  UsersIcon,
  BookmarkSimpleIcon,
  VideoCameraIcon,
  ArrowSquareOutIcon,
  ClockIcon,
  ExamIcon,
} from '@/components/ui/icons'

// ── API-aligned types ────────────────────────────────────────────────────────

type ApiBatch = {
  id: string
  code: string
  trackId: string
  startDate: string | null // 'YYYY-MM-DD'
  status: 'upcoming' | 'active' | 'completed'
  scheduledAt: string | null // ISO datetime — next scheduled class
  meetingUrl: string | null
}

type ApiChapter = {
  id: string
  trackId: string
  code: string
  title: string
  status: 'draft' | 'published'
  order: number
  script: 'te' | 'sa' | 'en' | null
  textUrl: string | null
}

type ApiTrack = {
  id: string
  name: string
  order: number
  chapters: ApiChapter[]
}

type ApiEvaluation = {
  id: string
  studentId: string
  chapterId: string
  level: ProficiencyLevel
  notes: string | null
  evaluatorId: string
  evaluatedAt: string | null // ISO datetime
}

type ApiExam = {
  id: string
  chapterId: string
  studentId: string
  scheduledAt: string // ISO datetime
  status: 'scheduled' | 'inProgress' | 'completed' | 'cancelled'
  evaluationId: string | null
  performedAt: string | null
}

// ── Mock data (API-shape aligned) ────────────────────────────────────────────

const TRACK_RIG1_ID = '01960000-0000-7000-0000-000000000001'
const TRACK_YAJ_ID = '01960000-0000-7000-0000-000000000002'

const CH = {
  agni: '01960000-0000-7000-0001-000000000001',
  vayu: '01960000-0000-7000-0001-000000000002',
  indra: '01960000-0000-7000-0001-000000000003',
  mitraVaruna: '01960000-0000-7000-0001-000000000004',
  ashvins: '01960000-0000-7000-0001-000000000005',
  ishavasya: '01960000-0000-7000-0002-000000000001',
  purusha: '01960000-0000-7000-0002-000000000002',
  shri: '01960000-0000-7000-0002-000000000003',
}

const MOCK_TRACKS: ApiTrack[] = [
  {
    id: TRACK_RIG1_ID,
    name: 'Rigveda Sukta Selection I',
    order: 1,
    chapters: [
      {
        id: CH.agni,
        trackId: TRACK_RIG1_ID,
        code: '1.1',
        title: 'Agni Sukta',
        status: 'published',
        order: 1,
        script: 'sa',
        textUrl: null,
      },
      {
        id: CH.vayu,
        trackId: TRACK_RIG1_ID,
        code: '1.2',
        title: 'Vayu Sukta',
        status: 'published',
        order: 2,
        script: 'sa',
        textUrl: null,
      },
      {
        id: CH.indra,
        trackId: TRACK_RIG1_ID,
        code: '1.3',
        title: 'Indra Sukta',
        status: 'published',
        order: 3,
        script: 'sa',
        textUrl: null,
      },
      {
        id: CH.mitraVaruna,
        trackId: TRACK_RIG1_ID,
        code: '1.4',
        title: 'Mitra-Varuna Sukta',
        status: 'published',
        order: 4,
        script: 'sa',
        textUrl: null,
      },
      {
        id: CH.ashvins,
        trackId: TRACK_RIG1_ID,
        code: '1.5',
        title: 'Ashvins Sukta',
        status: 'published',
        order: 5,
        script: 'sa',
        textUrl: null,
      },
    ],
  },
  {
    id: TRACK_YAJ_ID,
    name: 'Yajurveda Introductory',
    order: 2,
    chapters: [
      {
        id: CH.ishavasya,
        trackId: TRACK_YAJ_ID,
        code: '1.1',
        title: 'Ishavasyopanishad',
        status: 'published',
        order: 1,
        script: 'sa',
        textUrl: null,
      },
      {
        id: CH.purusha,
        trackId: TRACK_YAJ_ID,
        code: '1.2',
        title: 'Purushasukta',
        status: 'published',
        order: 2,
        script: 'sa',
        textUrl: null,
      },
      {
        id: CH.shri,
        trackId: TRACK_YAJ_ID,
        code: '1.3',
        title: 'Shri Sukta',
        status: 'published',
        order: 3,
        script: 'sa',
        textUrl: null,
      },
    ],
  },
]

const MOCK_BATCHES: ApiBatch[] = [
  {
    id: '01960000-0000-7000-0003-000000000001',
    code: 'BATCH-2025A',
    trackId: TRACK_RIG1_ID,
    startDate: '2025-01-15',
    status: 'active',
    scheduledAt: '2025-05-17T04:30:00.000Z',
    meetingUrl: 'https://zoom.us/j/1234567890',
  },
  {
    id: '01960000-0000-7000-0003-000000000002',
    code: 'BATCH-2025B',
    trackId: TRACK_YAJ_ID,
    startDate: '2025-03-01',
    status: 'active',
    scheduledAt: null,
    meetingUrl: null,
  },
]

// Evaluations sorted DESC by evaluatedAt (matches API sort order)
const MOCK_EVALUATIONS: ApiEvaluation[] = [
  {
    id: '01960000-0001-7000-0001-000000000004',
    studentId: 'student-1',
    chapterId: CH.mitraVaruna,
    level: 'practicing',
    notes: null,
    evaluatorId: 'teacher-1',
    evaluatedAt: '2025-05-10T00:00:00.000Z',
  },
  {
    id: '01960000-0001-7000-0001-000000000003',
    studentId: 'student-1',
    chapterId: CH.indra,
    level: 'level1',
    notes: null,
    evaluatorId: 'teacher-1',
    evaluatedAt: '2025-05-08T00:00:00.000Z',
  },
  {
    id: '01960000-0001-7000-0001-000000000002',
    studentId: 'student-1',
    chapterId: CH.vayu,
    level: 'level2',
    notes: null,
    evaluatorId: 'teacher-1',
    evaluatedAt: '2025-05-05T00:00:00.000Z',
  },
  {
    id: '01960000-0001-7000-0001-000000000001',
    studentId: 'student-1',
    chapterId: CH.agni,
    level: 'level3',
    notes: null,
    evaluatorId: 'teacher-1',
    evaluatedAt: '2025-05-02T00:00:00.000Z',
  },
  {
    id: '01960000-0001-7000-0002-000000000001',
    studentId: 'student-1',
    chapterId: CH.ishavasya,
    level: 'level1',
    notes: null,
    evaluatorId: 'teacher-1',
    evaluatedAt: '2025-04-20T00:00:00.000Z',
  },
]

const MOCK_EXAMS: ApiExam[] = [
  {
    id: '01960000-0002-7000-0001-000000000001',
    chapterId: CH.mitraVaruna,
    studentId: 'student-1',
    scheduledAt: '2025-05-24T04:30:00.000Z',
    status: 'scheduled',
    evaluationId: null,
    performedAt: null,
  },
  {
    id: '01960000-0002-7000-0002-000000000001',
    chapterId: CH.purusha,
    studentId: 'student-1',
    scheduledAt: '2025-05-28T08:30:00.000Z',
    status: 'scheduled',
    evaluationId: null,
    performedAt: null,
  },
]

const STUDENT_NAME = 'Revanth'
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

function findNextClass(batches: ApiBatch[]): ApiBatch | null {
  return (
    batches
      .filter(b => b.scheduledAt !== null && b.meetingUrl !== null)
      .sort((a, b) => new Date(a.scheduledAt!).getTime() - new Date(b.scheduledAt!).getTime())[0] ??
    null
  )
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

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default async function DashboardPage() {
  const cookieStore = await cookies()
  const savedChapterId = cookieStore.get(CONTINUE_COOKIE)?.value

  const chapterMap = buildChapterMap(MOCK_TRACKS)
  const trackMap = new Map(MOCK_TRACKS.map(t => [t.id, t]))
  const profMap = buildProficiencyMap(MOCK_EVALUATIONS)

  // "Continue" target: cookie chapter → first practicing chapter
  const savedChapter = savedChapterId ? chapterMap.get(savedChapterId) : undefined
  const savedBatch = savedChapter
    ? MOCK_BATCHES.find(b => b.trackId === savedChapter.trackId)
    : undefined
  const continueTarget =
    savedChapter && savedBatch
      ? { chapter: savedChapter, batch: savedBatch }
      : findFirstPracticingChapter(MOCK_BATCHES, trackMap, profMap)

  const nextClass = findNextClass(MOCK_BATCHES)
  const nextClassTrack = nextClass ? trackMap.get(nextClass.trackId) : null

  const recentEvals = MOCK_EVALUATIONS.slice(0, 4)
  const upcomingExams = MOCK_EXAMS.filter(e => e.status === 'scheduled')

  return (
    <AppShell navigationItems={navItems}>
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
            {STUDENT_NAME}.
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
              {recentEvals.map(ev => {
                const chapter = chapterMap.get(ev.chapterId)
                const batchCode = MOCK_BATCHES.find(b => b.trackId === chapter?.trackId)?.code
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
                  <p className="mb-0.5 text-sm font-medium">{nextClass.code}</p>
                  <p className="mb-4 text-xs text-muted-foreground">Track {nextClassTrack.order}</p>
                  <div className="flex items-end justify-between">
                    <div className="space-y-1.5 text-xs text-muted-foreground">
                      <p className="flex items-center gap-1.5">
                        <CalendarBlankIcon className="size-3.5" />
                        {formatDate(nextClass.scheduledAt!)}
                      </p>
                      <p className="flex items-center gap-1.5">
                        <ClockIcon className="size-3.5" />
                        {formatTime(nextClass.scheduledAt!)}
                      </p>
                    </div>
                    <a
                      href={nextClass.meetingUrl!}
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
            {MOCK_BATCHES.map(batch => {
              const track = trackMap.get(batch.trackId)
              if (!track) return null
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
