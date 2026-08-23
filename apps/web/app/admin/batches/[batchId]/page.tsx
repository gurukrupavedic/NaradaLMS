import { notFound, redirect } from 'next/navigation'

import { ADMIN_NAV_ITEM, AppShell, type NavigationItem } from '@/components/app-shell'
import { EnrollStudentDialog } from '@/components/admin/enroll-student-dialog'
import { RosterMatrix } from '@/components/admin/roster-matrix'
import { Badge } from '@/components/ui/badge'
import { Breadcrumb } from '@/components/ui/breadcrumb'
import { Progress } from '@/components/ui/progress'
import {
  CalendarBlankIcon,
  ClockIcon,
  HouseIcon,
  VideoCameraIcon,
} from '@/components/ui/icons'
import { getBatch } from '@/lib/api/batches'
import { getBatchEvaluations } from '@/lib/api/evaluations'
import { getTracks } from '@/lib/api/tracks'
import {
  getBatchProgress,
  getChapterLevel,
  getCurrentChapter,
  getLatestEvaluation,
  toRosterStudent,
  type RosterRow,
} from '@/lib/roster'
import { getCurrentProfile, hasSchoolWideAccess } from '@/lib/session'
import type { ApiChapter, ApiEvaluation } from '@/lib/types'

const navItems: NavigationItem[] = [{ label: 'Dashboard', icon: HouseIcon, href: '/' }, ADMIN_NAV_ITEM]

const STATUS_CONFIG = {
  active: { label: 'Active', variant: 'default' as const },
  upcoming: { label: 'Upcoming', variant: 'outline' as const },
  completed: { label: 'Completed', variant: 'secondary' as const },
}

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

function formatTime(time: string): string {
  const [hours, minutes] = time.split(':').map(Number)
  const period = hours >= 12 ? 'PM' : 'AM'
  const hour12 = hours % 12 === 0 ? 12 : hours % 12
  return `${hour12}:${String(minutes).padStart(2, '0')} ${period}`
}

function buildRoster(
  chapters: ApiChapter[],
  evaluations: ApiEvaluation[],
  students: ReturnType<typeof toRosterStudent>[],
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

export default async function AdminBatchDetailPage({
  params,
}: {
  params: Promise<{ batchId: string }>
}) {
  const { batchId } = await params

  const isAdmin = await hasSchoolWideAccess()
  if (!isAdmin) redirect('/')

  const [profile, batch, tracks, evaluations] = await Promise.all([
    getCurrentProfile(),
    getBatch(batchId).catch(() => null),
    getTracks(),
    getBatchEvaluations(batchId),
  ])

  if (!batch) notFound()

  const track = tracks.find(t => t.id === batch.trackId)
  if (!track) notFound()

  const instructors = batch.members.filter(m => m.role !== 'student')
  const students = batch.members.filter(m => m.role === 'student').map(toRosterStudent)
  const roster = buildRoster(track.chapters, evaluations, students)
  const { progress, masteredProgress } = getBatchProgress(evaluations, track.chapters, students)
  const st = STATUS_CONFIG[batch.status]

  return (
    <AppShell navigationItems={navItems} profile={profile}>
      <div className="mx-auto max-w-6xl space-y-8 px-4 py-8">
        <Breadcrumb
          items={[
            { label: 'Dashboard', href: '/' },
            { label: 'Admin', href: '/admin' },
            { label: batch.code },
          ]}
        />

        {/* Header */}
        <div className="bg-card ring-1 ring-foreground/10">
          <div className="flex items-start justify-between gap-4 px-5 py-4">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h1 className="font-mono text-lg font-semibold">{batch.code}</h1>
                <Badge variant={st.variant}>{st.label}</Badge>
              </div>
              <p className="mt-1 text-sm text-muted-foreground">
                Track {track.order} — {track.name}
              </p>
            </div>
            <div className="shrink-0 text-right">
              <p className="text-xs text-muted-foreground">{students.length} students</p>
              <p className="mt-1 text-lg font-semibold tabular-nums">{progress}%</p>
              <p className="text-xs text-muted-foreground tabular-nums">{masteredProgress}% mastered</p>
            </div>
          </div>
          <Progress value={progress} className="h-1 rounded-none" />
          {(batch.startDate || batch.meetingUrl || track.chapters.length > 0) && (
            <div className="flex flex-wrap items-center gap-x-6 gap-y-2 border-t border-border/50 px-5 py-3 text-xs text-muted-foreground">
              {batch.startDate && (
                <span className="flex items-center gap-1.5">
                  <CalendarBlankIcon className="size-3.5" />
                  {formatDate(batch.startDate)}
                </span>
              )}
              {batch.meetingUrl && (
                <a
                  href={batch.meetingUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 text-primary hover:underline"
                >
                  <VideoCameraIcon className="size-3.5" />
                  Meeting link
                </a>
              )}
              {batch.classSlots.length > 0 && (
                <span className="flex items-center gap-1.5">
                  <ClockIcon className="size-3.5" />
                  {batch.classSlots
                    .map(slot => `${DAY_NAMES[slot.dayOfWeek]} ${formatTime(slot.time)}`)
                    .join(', ')}
                </span>
              )}
            </div>
          )}
        </div>

        {/* Instructors & TAs */}
        {instructors.length > 0 && (
          <div className="space-y-3">
            <h2 className="font-serif text-lg font-semibold">Instructors &amp; TAs</h2>
            <div className="grid gap-2 sm:grid-cols-2">
              {instructors.map(member => (
                <div
                  key={member.profileId}
                  className="bg-card flex items-center justify-between gap-2 px-4 py-2.5 ring-1 ring-foreground/10"
                >
                  <span className="text-sm font-medium">{member.name}</span>
                  <Badge variant="outline" className="shrink-0 capitalize">
                    {member.role}
                  </Badge>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Student matrix */}
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <h2 className="font-serif text-lg font-semibold">Students</h2>
            <EnrollStudentDialog batchId={batch.id} />
          </div>
          {roster.length === 0 ? (
            <p className="text-sm text-muted-foreground">No students enrolled.</p>
          ) : (
            <RosterMatrix batchId={batch.id} chapters={track.chapters} roster={roster} />
          )}
        </div>
      </div>
    </AppShell>
  )
}
