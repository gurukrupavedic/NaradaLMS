'use client'

import { Sheet, SheetContent, SheetDescription, SheetTitle } from '@/components/ui/sheet'

interface StudentHistoryDrawerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description: string
  children: React.ReactNode
}

// Wide drawer for a student's learning record — opened from a roster row instead of navigating
// to the standalone /batches/[batchId]/students/[studentId] page. That page still exists as a
// direct, shareable destination; this is just the quick in-context view.
export function StudentHistoryDrawer({
  open,
  onOpenChange,
  title,
  description,
  children,
}: StudentHistoryDrawerProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="overflow-y-auto data-[side=right]:w-full data-[side=right]:sm:max-w-3xl"
      >
        <SheetTitle className="sr-only">{title}</SheetTitle>
        <SheetDescription className="sr-only">{description}</SheetDescription>
        <div className="p-5">{children}</div>
      </SheetContent>
    </Sheet>
  )
}
