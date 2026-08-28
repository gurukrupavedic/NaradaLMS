'use client'

import { useState, useTransition } from 'react'
import { toast } from 'sonner'

import { removeStudent } from '@/lib/admin-actions'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { XIcon } from '@/components/ui/icons'

export function RemoveStudentAction({
  batchId,
  studentId,
  studentName,
}: {
  batchId: string
  studentId: string
  studentName: string
}) {
  const [open, setOpen] = useState(false)
  const [pending, startTransition] = useTransition()

  function handleRemove() {
    startTransition(async () => {
      try {
        await removeStudent(batchId, studentId)
        toast.success('Student removed', { description: studentName })
        setOpen(false)
      } catch {
        toast.error('Failed to remove student')
      }
    })
  }

  return (
    <>
      <Button
        variant="ghost"
        size="icon-xs"
        aria-label={`Remove ${studentName} from this batch`}
        onClick={() => setOpen(true)}
      >
        <XIcon className="size-3.5" />
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-sm" aria-describedby="remove-student-description">
          <DialogHeader>
            <DialogTitle>Remove student?</DialogTitle>
            <DialogDescription id="remove-student-description">
              {studentName} will be removed from this batch. Their evaluation history is kept.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" size="sm" onClick={handleRemove} disabled={pending}>
              {pending ? 'Removing…' : 'Remove'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
