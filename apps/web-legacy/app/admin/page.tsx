import { redirect } from 'next/navigation'

import { AppShell } from '@/components/app-shell'
import { getNavItems } from '@/lib/nav-items'
import { Standing } from '@/components/dashboard/standing'
import { Archive, Section } from '@/components/dashboard/section'
import { BatchTable, FilterableBatchTable } from '@/components/admin/batch-table'
import { getMyBatchMemberships } from '@/lib/api/batches'
import { getTracks } from '@/lib/api/tracks'
import { getCurrentProfile, hasSchoolWideAccess } from '@/lib/session'
import { pluralize, splitByStatus } from '@/lib/dashboard-view'
import { buildAdminRows, describeSetupGaps, summarizeSchool } from '@/lib/admin-view'

export default async function AdminPage() {
  // A deliberately standalone check, made once per page load — unlike the per-batch role that
  // GET /profiles/:id/batches now resolves, this doesn't chain into any per-batch fetch, so it
  // can't reproduce the fan-out that took the dashboard down (see lib/dashboard.ts).
  const isAdmin = await hasSchoolWideAccess()
  if (!isAdmin) redirect('/')

  // For a school-wide admin this returns every batch in the school, already carrying members and
  // class slots, in one paginated query — so roster sizes and teaching staff come for free rather
  // than costing a fetch per batch. Only the payload is read here; nothing fans out per batch.
  const [profile, memberships, tracks] = await Promise.all([
    getCurrentProfile(),
    getMyBatchMemberships(),
    getTracks(),
  ])

  const rows = buildAdminRows(
    memberships.map(membership => membership.batch),
    tracks,
  )
  const summary = summarizeSchool(rows)
  const setupGaps = describeSetupGaps(summary)
  const { active, archived } = splitByStatus(rows)

  return (
    <AppShell navigationItems={getNavItems(isAdmin)} profile={profile}>
      <Standing
        eyebrow={`${profile?.name ?? 'Admin'} · administration`}
        headline={pluralize(summary.active, 'active batch', 'active batches')}
        meta={`${summary.total} total · ${pluralize(summary.students, 'student')} · ${pluralize(summary.tracks, 'track')}`}
        stats={[
          { value: String(summary.active), label: 'Active' },
          { value: String(summary.students), label: 'Students' },
        ]}
      />

      <div className="mx-auto max-w-5xl space-y-10 px-4 py-8">
        {/* Every active batch in the real school is missing both a join link and a schedule.
            Flagging that per row would mark all 43; it belongs here, once. */}
        {setupGaps && (
          <p className="border-l-2 border-primary bg-primary/5 px-4 py-3 text-sm text-muted-foreground">
            {setupGaps}
          </p>
        )}

        {rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">No batches yet.</p>
        ) : (
          <>
            <Section title="Active" count={pluralize(active.length, 'batch', 'batches')}>
              {active.length === 0 ? (
                <p className="text-sm text-muted-foreground">No active batches.</p>
              ) : (
                <FilterableBatchTable rows={active} emptyLabel="No batches match that filter." />
              )}
            </Section>

            {archived.length > 0 && (
              <Archive
                label={pluralize(archived.length, 'completed batch', 'completed batches')}
              >
                <BatchTable rows={archived} />
              </Archive>
            )}
          </>
        )}
      </div>
    </AppShell>
  )
}
