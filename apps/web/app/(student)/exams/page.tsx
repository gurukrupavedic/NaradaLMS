import { AppShell } from '@/components/app-shell'
import { getNavItems } from '@/lib/nav-items'
import { ProficiencyBadge } from '@/components/proficiency-badge'
import { ArrowSquareOutIcon } from '@/components/ui/icons'
import { getMyBatchMemberships } from '@/lib/api/batches'
import { getExams } from '@/lib/api/exams'
import { fetchAllPages } from '@/lib/api/pagination'
import { getTracks } from '@/lib/api/tracks'
import { getCurrentProfile, hasSchoolWideAccess } from '@/lib/session'

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

export default async function ExamsPage() {
  const [profile, isAdmin, exams, tracks, memberships] = await Promise.all([
    getCurrentProfile(),
    hasSchoolWideAccess(),
    fetchAllPages(cursor => getExams({ cursor })),
    getTracks(),
    getMyBatchMemberships(),
  ])

  const trackMap = new Map(tracks.map(t => [t.id, t]))
  const meetingUrlByTrackId = new Map(
    memberships
      .filter((m): m is typeof m & { batch: { meetingUrl: string } } =>
        Boolean(m.role === 'student' && m.batch.meetingUrl),
      )
      .map(m => [m.batch.trackId, m.batch.meetingUrl]),
  )

  const upcoming = exams
    .filter(exam => exam.status === 'scheduled' || exam.status === 'inProgress')
    .sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime())

  const past = exams
    .filter(exam => exam.status === 'completed')
    .sort((a, b) => new Date(b.scheduledAt).getTime() - new Date(a.scheduledAt).getTime())

  return (
    <AppShell navigationItems={getNavItems(isAdmin)} profile={profile}>
      <div className="mx-auto max-w-3xl space-y-10 px-4 py-8">
        <div>
          <p className="mb-2 text-xs uppercase tracking-widest text-muted-foreground">
            Your progress
          </p>
          <h1 className="font-serif text-2xl font-semibold">Exams</h1>
        </div>

        <div className="space-y-3">
          <div className="flex items-center gap-4">
            <h2 className="shrink-0 font-serif text-lg font-semibold">Upcoming</h2>
            <div className="h-px flex-1 bg-border" />
          </div>
          {upcoming.length === 0 ? (
            <p className="text-sm text-muted-foreground">No exams scheduled.</p>
          ) : (
            <div className="divide-y divide-border/30 bg-card ring-1 ring-foreground/10">
              {upcoming.map(exam => {
                const track = trackMap.get(exam.chapter.trackId)
                const meetingUrl = meetingUrlByTrackId.get(exam.chapter.trackId)
                return (
                  <div key={exam.id} className="px-4 py-3">
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">{exam.chapter.title}</p>
                        <p className="mt-0.5 truncate text-xs text-muted-foreground">
                          {exam.chapter.code}&ensp;·&ensp;{track?.name ?? '—'}
                        </p>
                      </div>
                      <div className="shrink-0 text-right text-xs text-muted-foreground">
                        <p>{formatDate(exam.scheduledAt)}</p>
                        <p>{formatTime(exam.scheduledAt)}</p>
                      </div>
                    </div>
                    {meetingUrl && (
                      <a
                        href={meetingUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
                      >
                        Join
                        <ArrowSquareOutIcon className="size-3" />
                      </a>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>

        <div className="space-y-3">
          <div className="flex items-center gap-4">
            <h2 className="shrink-0 font-serif text-lg font-semibold">Past exams</h2>
            <div className="h-px flex-1 bg-border" />
          </div>
          {past.length === 0 ? (
            <p className="text-sm text-muted-foreground">No completed exams yet.</p>
          ) : (
            <div className="divide-y divide-border/30 bg-card ring-1 ring-foreground/10">
              {past.map(exam => {
                const track = trackMap.get(exam.chapter.trackId)
                return (
                  <div key={exam.id} className="flex items-start justify-between gap-3 px-4 py-3">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{exam.chapter.title}</p>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {exam.chapter.code}&ensp;·&ensp;{track?.name ?? '—'}&ensp;·&ensp;
                        {formatDate(exam.scheduledAt)}
                      </p>
                      {exam.evaluation?.notes && (
                        <p className="mt-1.5 text-xs leading-5 text-muted-foreground">
                          {exam.evaluation.notes}
                        </p>
                      )}
                    </div>
                    {exam.evaluation && <ProficiencyBadge level={exam.evaluation.level} compact />}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </AppShell>
  )
}
