'use client'

import { Drawer } from '@/components/drawer'
import { ProfileSearchList } from '@/components/admin/profile-search-list'
import type { AdminBatchDetail } from '@/lib/models/dashboard'

/**
 * The admin "add a student" flow, opened from the roster's "+ Add student" button
 * (components/admin/batch-detail.tsx). A drawer rather than an inline box: the search itself can
 * turn up dozens of matches, and the roster/mark book underneath shouldn't have to make room for a
 * list that long every time an admin so much as glances at this batch.
 *
 * Students only. Teachers are added from the "Edit staff" drawer (edit-staff-drawer.tsx) and a TA is
 * made by promoting a student from the roster's row menu — a TA is a student who also assists, so
 * there is no separate way in.
 */
export function AddStudentDrawer({
  batch,
  open,
  onOpenChange,
}: {
  batch: AdminBatchDetail
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  return (
    <Drawer open={open} onOpenChange={onOpenChange} title="Add a student" description={batch.code}>
      <ProfileSearchList batch={batch} role="student" />
    </Drawer>
  )
}
