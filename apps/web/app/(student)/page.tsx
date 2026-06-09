import { cookies } from 'next/headers'

import { getProficiencyProgress, type ProficiencyLevel } from '@/lib/proficiency'
import { PROFICIENCY_LEVELS, getProficiencyConfig } from '@/lib/proficiency'
import { AppShell, type NavigationItem } from '@/components/app-shell'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { TrackCard, type ChapterData } from '@/components/track-card'
import { ProficiencyBadge } from '@/components/proficiency-badge'
import {
  BookOpenIcon,
  HouseIcon,
  CalendarBlankIcon,
  UserIcon,
  UsersIcon,
  BookmarkSimpleIcon,
  VideoCameraIcon,
  ArrowSquareOutIcon,
  ClockIcon,
  ExamIcon,
} from '@/components/ui/icons'

interface BatchData {
  code: string
  trackName: string
  instructor: string
  studentCount: number
  startDate: string
  status: 'active' | 'completed' | 'upcoming'
  tracks: {
    title: string
    trackNumber: number
    isCurrent: boolean
    chapters: ChapterData[]
  }[]
}

interface UpcomingClass {
  batchCode: string
  title: string
  date: string
  time: string
  zoomUrl: string
}

interface RecentEvaluation {
  chapterTitle: string
  batchCode: string
  level: ProficiencyLevel
  evaluatedAt: string
}

interface UpcomingExam {
  chapterTitle: string
  batchCode: string
  date: string
  time: string
}

const navItems: NavigationItem[] = [
  { label: 'Dashboard', icon: HouseIcon },
  { label: 'Learning', icon: BookOpenIcon },
  { label: 'Batches', icon: UsersIcon },
]

const STUDENT = {
  name: 'Revanth',
  batches: [
    {
      code: 'BATCH-2025A',
      trackName: 'Rigveda Sukta Selection I',
      instructor: 'Sri Sharma',
      studentCount: 12,
      startDate: '2025-01-15',
      status: 'active' as const,
      tracks: [
        {
          title: 'Rigveda Sukta Selection I',
          trackNumber: 1,
          isCurrent: true,
          chapters: [
            {
              id: 'ch1',
              code: '1.1',
              title: 'Agni Sukta',
              proficiency: 'level3' as const,
              evaluatedAt: 'May 2',
            },
            {
              id: 'ch2',
              code: '1.2',
              title: 'Vayu Sukta',
              proficiency: 'level2' as const,
              evaluatedAt: 'May 5',
            },
            {
              id: 'ch3',
              code: '1.3',
              title: 'Indra Sukta',
              proficiency: 'level1' as const,
              evaluatedAt: 'May 8',
            },
            {
              id: 'ch4',
              code: '1.4',
              title: 'Mitra-Varuna Sukta',
              proficiency: 'practicing' as const,
            },
            { id: 'ch5', code: '1.5', title: 'Ashvins Sukta', proficiency: 'notStarted' as const },
          ],
        },
        {
          title: 'Rigveda Sukta Selection II',
          trackNumber: 2,
          isCurrent: false,
          chapters: [
            { id: 'ch6', code: '2.1', title: 'Surya Sukta', proficiency: 'notStarted' as const },
            { id: 'ch7', code: '2.2', title: 'Ushas Sukta', proficiency: 'notStarted' as const },
            { id: 'ch8', code: '2.3', title: 'Soma Sukta', proficiency: 'notStarted' as const },
            { id: 'ch9', code: '2.4', title: 'Vishnu Sukta', proficiency: 'notStarted' as const },
          ],
        },
      ],
    },
    {
      code: 'BATCH-2025B',
      trackName: 'Yajurveda Introductory',
      instructor: 'Sri Rao',
      studentCount: 8,
      startDate: '2025-03-01',
      status: 'active' as const,
      tracks: [
        {
          title: 'Yajurveda Introductory',
          trackNumber: 1,
          isCurrent: true,
          chapters: [
            {
              id: 'ch10',
              code: '1.1',
              title: 'Ishavasyopanishad',
              proficiency: 'level1' as const,
              evaluatedAt: 'Apr 20',
            },
            { id: 'ch11', code: '1.2', title: 'Purushasukta', proficiency: 'practicing' as const },
            { id: 'ch12', code: '1.3', title: 'Shri Sukta', proficiency: 'notStarted' as const },
          ],
        },
      ],
    },
  ] satisfies BatchData[],
}

const NEXT_CLASS: UpcomingClass = {
  batchCode: 'BATCH-2025A',
  title: 'Mitra-Varuna Sukta — Practice Session',
  date: '2025-05-17',
  time: '10:00 AM',
  zoomUrl: 'https://zoom.us/j/1234567890',
}

const RECENT_EVALUATIONS: RecentEvaluation[] = [
  {
    chapterTitle: 'Indra Sukta',
    batchCode: 'BATCH-2025A',
    level: 'level1',
    evaluatedAt: '2025-05-08',
  },
  {
    chapterTitle: 'Vayu Sukta',
    batchCode: 'BATCH-2025A',
    level: 'level2',
    evaluatedAt: '2025-05-05',
  },
  {
    chapterTitle: 'Agni Sukta',
    batchCode: 'BATCH-2025A',
    level: 'level3',
    evaluatedAt: '2025-05-02',
  },
  {
    chapterTitle: 'Ishavasyopanishad',
    batchCode: 'BATCH-2025B',
    level: 'level1',
    evaluatedAt: '2025-04-20',
  },
]

const UPCOMING_EXAMS: UpcomingExam[] = [
  {
    chapterTitle: 'Mitra-Varuna Sukta',
    batchCode: 'BATCH-2025A',
    date: '2025-05-24',
    time: '10:00 AM',
  },
  { chapterTitle: 'Purushasukta', batchCode: 'BATCH-2025B', date: '2025-05-28', time: '2:00 PM' },
]

const CONTINUE_COOKIE = 'narada-continue-chapter'

function findChapterById(chapterId: string) {
  for (const batch of STUDENT.batches) {
    for (const track of batch.tracks) {
      const chapter = track.chapters.find(ch => ch.id === chapterId)
      if (chapter) {
        return { batch, track, chapter }
      }
    }
  }
  return null
}

function findFirstPracticingChapter() {
  for (const batch of STUDENT.batches) {
    if (batch.status !== 'active') continue
    for (const track of batch.tracks) {
      if (!track.isCurrent) {
        continue
      }

      const chapter = track.chapters.find(ch => ch.proficiency === 'practicing')
      if (chapter) {
        return { batch, track, chapter }
      }
    }
  }
  return null
}

function getBatchProgress(batch: BatchData): number {
  const levels = batch.tracks.flatMap(t => t.chapters.map(ch => ch.proficiency))
  return getProficiencyProgress(levels)
}

function formatDate(iso: string): string {
  const date = new Date(iso)
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

export default async function DashboardPage() {
  const cookieStore = await cookies()
  const savedChapterId = cookieStore.get(CONTINUE_COOKIE)?.value

  const continueTarget =
    (savedChapterId ? findChapterById(savedChapterId) : null) ?? findFirstPracticingChapter()

  return (
    <AppShell navigationItems={navItems}>
      <div className="mx-auto max-w-5xl space-y-6 px-4 py-6">
        {/* Header */}
        <div>
          <h1 className="text-lg font-semibold">Welcome back, {STUDENT.name}</h1>
          <p className="text-muted-foreground mt-0.5 text-xs">
            Here&apos;s your learning progress overview.
          </p>
        </div>

        {/* Top row: continue learning + next class */}
        <div className="grid gap-3 md:grid-cols-2">
          {continueTarget && (
            <div className="ring-foreground/10 bg-card space-y-2 p-4 ring-1">
              <div className="flex items-center gap-2">
                <BookmarkSimpleIcon className="text-muted-foreground size-3.5" />
                <span className="text-muted-foreground text-xs font-medium">Continue learning</span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{continueTarget.chapter.title}</p>
                  <p className="text-muted-foreground mt-0.5 text-xs">
                    {continueTarget.batch.code} · {continueTarget.track.title} · Chapter{' '}
                    {continueTarget.chapter.code}
                  </p>
                </div>
                <ProficiencyBadge level={continueTarget.chapter.proficiency} />
              </div>
            </div>
          )}

          <div className="ring-foreground/10 bg-card space-y-2 p-4 ring-1">
            <div className="flex items-center gap-2">
              <VideoCameraIcon className="text-muted-foreground size-3.5" />
              <span className="text-muted-foreground text-xs font-medium">Next class</span>
            </div>
            <p className="truncate text-sm font-medium">{NEXT_CLASS.title}</p>
            <div className="flex items-center justify-between gap-3">
              <div className="text-muted-foreground flex items-center gap-3 text-xs">
                <span className="flex items-center gap-1">
                  <CalendarBlankIcon className="size-3.5" />
                  {formatDate(NEXT_CLASS.date)}
                </span>
                <span className="flex items-center gap-1">
                  <ClockIcon className="size-3.5" />
                  {NEXT_CLASS.time}
                </span>
              </div>
              <a
                href={NEXT_CLASS.zoomUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary inline-flex shrink-0 items-center gap-1 text-xs font-medium hover:underline"
              >
                Join
                <ArrowSquareOutIcon className="size-3" />
              </a>
            </div>
          </div>
        </div>

        {/* Activity: recent evaluations + upcoming exams */}
        <div className="grid gap-3 md:grid-cols-2">
          <div className="ring-foreground/10 bg-card overflow-hidden ring-1">
            <div className="border-border/50 flex items-center gap-2 border-b px-4 py-3">
              <ClockIcon className="text-muted-foreground size-3.5" />
              <span className="text-xs font-medium">Recent evaluations</span>
            </div>
            <div className="divide-border/30 divide-y">
              {RECENT_EVALUATIONS.map((ev, i) => (
                <div key={i} className="flex items-center gap-3 px-4 py-2.5">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm">{ev.chapterTitle}</p>
                    <p className="text-muted-foreground text-xs">
                      {ev.batchCode} · {formatDate(ev.evaluatedAt)}
                    </p>
                  </div>
                  <ProficiencyBadge level={ev.level} compact />
                </div>
              ))}
            </div>
          </div>

          <div className="ring-foreground/10 bg-card overflow-hidden ring-1">
            <div className="border-border/50 flex items-center gap-2 border-b px-4 py-3">
              <ExamIcon className="text-muted-foreground size-3.5" />
              <span className="text-xs font-medium">Upcoming exams</span>
            </div>
            <div className="divide-border/30 divide-y">
              {UPCOMING_EXAMS.map((exam, i) => (
                <div key={i} className="flex items-center gap-3 px-4 py-2.5">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm">{exam.chapterTitle}</p>
                    <p className="text-muted-foreground text-xs">{exam.batchCode}</p>
                  </div>
                  <div className="text-muted-foreground shrink-0 text-right text-xs">
                    <p>{formatDate(exam.date)}</p>
                    <p>{exam.time}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Batches */}
        <div className="space-y-2">
          <h2 className="text-sm font-medium">Your batches</h2>
          <div className="space-y-6">
            {STUDENT.batches.map(batch => (
              <BatchSection key={batch.code} batch={batch} />
            ))}
          </div>
        </div>

        {/* Proficiency legend */}
        <div className="space-y-2">
          <h2 className="text-muted-foreground text-xs font-medium">Proficiency levels</h2>
          <div className="flex flex-wrap gap-2">
            {PROFICIENCY_LEVELS.filter(l => l !== 'absent').map(level => {
              const config = getProficiencyConfig(level)
              return (
                <div key={level} className="flex items-center gap-1.5">
                  <ProficiencyBadge level={level} compact />
                  <span className="text-muted-foreground text-xs">{config.label}</span>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </AppShell>
  )
}

function BatchSection({ batch }: { batch: BatchData }) {
  const progress = getBatchProgress(batch)
  const statusConfig = {
    active: { label: 'Active', variant: 'default' as const },
    completed: { label: 'Completed', variant: 'secondary' as const },
    upcoming: { label: 'Upcoming', variant: 'outline' as const },
  }

  const st = statusConfig[batch.status]
  return (
    <div className="space-y-3">
      <div className="ring-foreground/10 bg-card overflow-hidden ring-1">
        <div className="space-y-3 p-4">
          <div className="flex items-center gap-2">
            <h3 className="truncate font-mono text-sm font-medium">{batch.code}</h3>
            <Badge variant={st.variant} className="shrink-0">
              {st.label}
            </Badge>
          </div>
          <p className="text-muted-foreground text-xs">
            Track: <span className="text-foreground/80">{batch.trackName}</span>
          </p>
          <div className="text-muted-foreground flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
            <span className="flex items-center gap-1">
              <UserIcon className="size-3.5" />
              {batch.instructor}
            </span>
            <span className="flex items-center gap-1">
              <UsersIcon className="size-3.5" />
              {batch.studentCount} students
            </span>
            <span className="flex items-center gap-1">
              <CalendarBlankIcon className="size-3.5" />
              {formatDate(batch.startDate)}
            </span>
          </div>
          <div className="flex justify-between text-xs">
            <span className="text-muted-foreground">Progress</span>
            <span className="tabular-nums">{Math.round(progress)}%</span>
          </div>
        </div>
        <Progress value={progress} className="h-1 rounded-none" />
      </div>

      <div className="space-y-2">
        {batch.tracks.map(track => (
          <TrackCard
            key={`${batch.code}-${track.trackNumber}`}
            title={track.title}
            trackNumber={track.trackNumber}
            chapters={track.chapters}
            isCurrent={track.isCurrent}
            defaultOpen={track.isCurrent}
          />
        ))}
      </div>
    </div>
  )
}
