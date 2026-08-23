import { AppShell } from '@/components/app-shell'
import { getNavItems } from '@/lib/nav-items'
import { Standing } from '@/components/dashboard/standing'
import { Section } from '@/components/dashboard/section'
import { LevelKey } from '@/components/dashboard/track-ladder'
import { CertificationRecord } from '@/components/dashboard/certification-record'
import { ProficiencyBadge } from '@/components/proficiency-badge'
import { ArrowSquareOutIcon } from '@/components/ui/icons'
import { getExams } from '@/lib/api/exams'
import { fetchAllPages } from '@/lib/api/pagination'
import { getDashboardData } from '@/lib/dashboard'
import { getCurrentProfile, hasSchoolWideAccess } from '@/lib/session'
import { pluralize } from '@/lib/dashboard-view'
import {
  buildCertificationRecord,
  groupExams,
  summarizeCertifications,
  type CertificationSummary,
} from '@/lib/exams-view'
import type { ProficiencyLevel } from '@/lib/proficiency'
import type { ApiEvaluation } from '@/lib/types'

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

function buildMarkMap(
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

export default async function ExamsPage() {
  const [dashboard, exams, profile, isAdmin] = await Promise.all([
    getDashboardData(),
    fetchAllPages(cursor => getExams({ cursor })),
    getCurrentProfile(),
    hasSchoolWideAccess(),
  ])

  const certifications = buildCertificationRecord(
    dashboard.tracks,
    buildMarkMap(dashboard.studentEvaluations),
  )
  const summary = summarizeCertifications(certifications)
  const { scheduled, completed } = groupExams(exams)

  const trackMap = new Map(dashboard.tracks.map(track => [track.id, track]))
  const meetingUrlByTrackId = new Map(
    dashboard.memberships
      .filter(item => item.role === 'student' && item.batch.meetingUrl)
      .map(item => [item.batch.trackId, item.batch.meetingUrl as string]),
  )

  return (
    <AppShell navigationItems={getNavItems(isAdmin)} profile={profile}>
      <Standing {...buildStanding(dashboard.firstName, summary)} />

      <div className="mx-auto max-w-5xl space-y-10 px-4 py-8">
        {/* The `exam` table tracks scheduled sittings and is separate from the certification
            marks below. It is routinely empty, so these sections are omitted entirely rather
            than rendered as two "nothing here" placeholders, which is what this page used to
            show every visitor. */}
        {scheduled.length > 0 && (
          <Section title="Scheduled" count={pluralize(scheduled.length, 'sitting')}>
            <ol className="divide-y divide-border/30 bg-card ring-1 ring-foreground/10">
              {scheduled.map(exam => {
                const track = trackMap.get(exam.chapter.trackId)
                const meetingUrl = meetingUrlByTrackId.get(exam.chapter.trackId)
                return (
                  <li key={exam.id} className="flex items-center gap-3 px-4 py-2.5">
                    <span className="w-10 shrink-0 font-mono text-xs tabular-nums text-muted-foreground">
                      {exam.chapter.code}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium">
                        {exam.chapter.title}
                      </span>
                      <span className="mt-0.5 block truncate text-xs text-muted-foreground">
                        {track?.name ?? '—'}
                      </span>
                    </span>
                    <span className="shrink-0 text-right text-xs text-muted-foreground">
                      {formatDate(exam.scheduledAt)}
                      <span className="hidden sm:inline">
                        {' · '}
                        {formatTime(exam.scheduledAt)}
                      </span>
                    </span>
                    {meetingUrl && (
                      <a
                        href={meetingUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex shrink-0 items-center gap-1 text-xs font-medium text-primary hover:underline"
                      >
                        Join
                        <ArrowSquareOutIcon className="size-3" />
                      </a>
                    )}
                  </li>
                )
              })}
            </ol>
          </Section>
        )}

        <Section
          title="Certification record"
          count={`${summary.certified}/${summary.total} tracks`}
        >
          <LevelKey />
          <CertificationRecord rows={certifications} />
        </Section>

        {completed.length > 0 && (
          <Section title="Sitting history" count={pluralize(completed.length, 'sitting')}>
            <ol className="divide-y divide-border/30 bg-card ring-1 ring-foreground/10">
              {completed.map(exam => {
                const track = trackMap.get(exam.chapter.trackId)
                return (
                  <li key={exam.id} className="flex items-start gap-3 px-4 py-2.5">
                    <span className="w-10 shrink-0 font-mono text-xs tabular-nums text-muted-foreground">
                      {exam.chapter.code}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm">{exam.chapter.title}</span>
                      <span className="mt-0.5 block text-xs text-muted-foreground">
                        {track?.name ?? '—'} · {formatDate(exam.scheduledAt)}
                      </span>
                      {exam.evaluation?.notes && (
                        <span className="mt-1.5 block text-xs leading-5 text-muted-foreground">
                          {exam.evaluation.notes}
                        </span>
                      )}
                    </span>
                    {exam.evaluation && (
                      <ProficiencyBadge level={exam.evaluation.level} compact />
                    )}
                  </li>
                )
              })}
            </ol>
          </Section>
        )}
      </div>
    </AppShell>
  )
}

function buildStanding(firstName: string, summary: CertificationSummary) {
  const eyebrow = `${firstName} · certification`
  const stats = [
    { value: `${summary.certified}/${summary.total}`, label: 'Certified' },
    { value: String(summary.mastered), label: 'At level 4' },
  ]

  if (summary.certified === 0) {
    return {
      eyebrow,
      headline: 'No certifications yet',
      meta: `${pluralize(summary.total, 'track certification')} to work toward.`,
      stats,
    }
  }

  const remaining = summary.total - summary.certified
  return {
    eyebrow,
    headline:
      summary.certified === summary.total
        ? 'Every track certified'
        : `Certified in ${summary.certified} of ${summary.total} tracks`,
    meta:
      summary.mastered > 0
        ? `${summary.mastered} at level 4${remaining > 0 ? ` · ${pluralize(remaining, 'track')} remaining` : ''}`
        : `${pluralize(remaining, 'track')} remaining`,
    stats,
  }
}
