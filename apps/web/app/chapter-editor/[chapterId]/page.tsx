import type { Metadata } from 'next'

import { AdminGate } from '@/components/admin/admin-gate'
import { ChapterEditor } from '@/components/admin/chapter-editor'

export const metadata: Metadata = { title: 'Edit chapter' }

/**
 * Deliberately outside the `(app)` route group, same reasoning as `/chapters/[chapterId]`'s own
 * doc comment (`app/(app)/layout.tsx`): this is a full-bleed editing surface with its own header,
 * not a page that forgot `AppShell`. It still needs the admin-only gate that group's `admin/
 * layout.tsx` would otherwise supply — `AdminGate` here is the same component, just applied
 * directly instead of inherited.
 */
export default async function ChapterEditorPage({ params }: { params: Promise<{ chapterId: string }> }) {
  const { chapterId } = await params

  return (
    <AdminGate>
      <ChapterEditor chapterId={chapterId} />
    </AdminGate>
  )
}
