'use client'

import { Drawer } from '@/components/drawer'
import { ProfileSearchList } from '@/components/admin/profile-search-list'
import { Spinner } from '@/components/spinner'
import { useChangeMemberRole, useRemoveTeacher } from '@/lib/query/use-enrollment-mutations'
import type { AdminBatchDetail, BatchStaff } from '@/lib/models/dashboard'

/**
 * The admin "edit teachers and TAs" flow, opened from the batch's "Edit staff" button
 * (components/admin/batch-detail.tsx).
 *
 * - Teachers can be added (the search below) and removed — except the last one, which the server
 *   also refuses (apps/api/src/enrollment/service.ts::removeInstructor); the button is disabled
 *   here so an admin never has to hit that 409 to learn it.
 * - TAs can only be removed. Adding one is "Promote to TA" in the roster's row menu
 *   (components/mark-book.tsx), since a TA is a student who also assists. Removing one steps them
 *   back to a plain student rather than dropping them from the batch.
 */
export function EditStaffDrawer({
  batch,
  open,
  onOpenChange,
}: {
  batch: AdminBatchDetail
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const removeTeacher = useRemoveTeacher(batch.code, batch.id)
  const changeRole = useChangeMemberRole(batch.code, batch.id)
  const teachers = batch.staffRoster.filter(member => member.role === 'instructor')
  const tas = batch.staffRoster.filter(member => member.role === 'ta')
  const busy = removeTeacher.isPending || changeRole.isPending

  function remove(member: BatchStaff) {
    if (member.role === 'instructor') {
      removeTeacher.mutate({ profileId: member.profileId, profileName: member.name })
    } else {
      changeRole.mutate({ profileId: member.profileId, profileName: member.name, role: 'student' })
    }
  }

  function row(member: BatchStaff, removable: boolean) {
    const pending =
      (removeTeacher.isPending && removeTeacher.variables?.profileId === member.profileId) ||
      (changeRole.isPending && changeRole.variables?.profileId === member.profileId)

    return (
      <li key={member.profileId} className="flex items-center justify-between gap-3 py-3">
        <span className="min-w-0 truncate text-[0.875rem]">{member.name}</span>
        <button
          type="button"
          disabled={busy || !removable}
          aria-busy={pending}
          aria-label={`Remove ${member.name}`}
          title={removable ? undefined : "A batch can't be left without a teacher"}
          onClick={() => remove(member)}
          className="label inline-flex min-w-[4.5rem] shrink-0 items-center justify-center gap-2 border border-ink/25 px-3 py-1 transition-colors hover:border-vermilion hover:text-vermilion disabled:opacity-50 disabled:hover:border-ink/25 disabled:hover:text-inherit"
        >
          {pending && <Spinner />}
          Remove
        </button>
      </li>
    )
  }

  return (
    <Drawer open={open} onOpenChange={onOpenChange} title="Edit staff" description={batch.code}>
      <span className="label block text-ink-muted">Teachers</span>
      {teachers.length === 0 ? (
        <p className="py-3 text-[0.8125rem] text-ink-muted">Nobody assigned.</p>
      ) : (
        <ul className="divide-y divide-rule">{teachers.map(member => row(member, teachers.length > 1))}</ul>
      )}

      <span className="label mt-6 block text-ink-muted">TAs</span>
      {tas.length === 0 ? (
        <p className="py-3 text-[0.8125rem] text-ink-muted">
          No TAs. Promote a student from the roster&rsquo;s row menu.
        </p>
      ) : (
        <>
          <ul className="divide-y divide-rule">{tas.map(member => row(member, true))}</ul>
          <p className="mt-1 text-[0.75rem] text-ink-muted">
            Removing a TA keeps them in the batch as a student.
          </p>
        </>
      )}

      <span className="label mt-8 mb-2 block text-ink-muted">Add a teacher</span>
      <ProfileSearchList batch={batch} role="instructor" />
    </Drawer>
  )
}
