import { notFound, redirect } from 'next/navigation'

import { AppShell } from '@/components/app-shell'
import { getNavItems } from '@/lib/nav-items'
import { Standing } from '@/components/dashboard/standing'
import { Section } from '@/components/dashboard/section'
import { EnrollStudentDialog } from '@/components/admin/enroll-student-dialog'
import { RosterMatrix } from '@/components/admin/roster-matrix'
import { Badge } from '@/components/ui/badge'
import { Breadcrumb } from '@/components/ui/breadcrumb'
import { CalendarBlankIcon, ClockIcon, VideoCameraIcon } from '@/components/ui/icons'
import { pluralize, trackLabel } from '@/lib/dashboard-view'
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
    <AppShell navigationItems={getNavItems(isAdmin)} profile={profile}>
      <Standing
        eyebrow={`${st.label} batch · ${trackLabel(track.order, track.name)}`}
        headline={batch.code}
        meta={pluralize(students.length, 'student')}
        stats={[
          { value: `${progress}%`, label: 'Started' },
          { value: `${masteredProgress}%`, label: 'Mastered' },
        ]}
      />

      <div className="mx-auto max-w-6xl space-y-10 px-4 py-8">
        <Breadcrumb
          items={[
            { label: 'Dashboard', href: '/' },
            { label: 'Admin', href: '/admin' },
            { label: batch.code },
          ]}
        />

        {/* Schedule and join details, when the batch has any set. Most don't. */}
        {(batch.startDate || batch.meetingUrl || batch.classSlots.length > 0) && (
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2 border-l-2 border-primary bg-primary/5 px-4 py-3 text-xs text-muted-foreground">
            {batch.startDate && (
              <span className="flex items-center gap-1.5">
                <CalendarBlankIcon className="size-3.5" />
                {formatDate(batch.startDate)}
              </span>
            )}
            {batch.classSlots.length > 0 && (
              <span className="flex items-center gap-1.5">
                <ClockIcon className="size-3.5" />
                {batch.classSlots
                  .map(slot => `${DAY_NAMES[slot.dayOfWeek]} ${formatTime(slot.time)}`)
                  .join(', ')}
              </span>
            )}
            {batch.meetingUrl && (
              <a
                href={batch.meetingUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 font-medium text-primary hover:underline"
              >
                <VideoCameraIcon className="size-3.5" />
                Join link
              </a>
            )}
          </div>
        )}

        {instructors.length > 0 && (
          <Section title="Teaching staff" count={pluralize(instructors.length, 'person', 'people')}>
            <ol className="divide-y divide-border/40 bg-card ring-1 ring-foreground/10">
              {instructors.map(member => (
                <li
                  key={member.profileId}
                  className="flex items-center justify-between gap-2 px-4 py-2.5"
                >
                  <span className="min-w-0 truncate text-sm">{member.name}</span>
                  <Badge variant="outline" className="shrink-0 capitalize">
                    {member.role}
                  </Badge>
                </li>
              ))}
            </ol>
          </Section>
        )}

        <Section title="Students" count={pluralize(roster.length, 'student')}>
          <div className="flex justify-end">
            <EnrollStudentDialog batchId={batch.id} />
          </div>
          {roster.length === 0 ? (
            <p className="text-sm text-muted-foreground">No students enrolled.</p>
          ) : (
            <RosterMatrix batchId={batch.id} chapters={track.chapters} roster={roster} />
          )}
        </Section>
      </div>
    </AppShell>
  )
}
