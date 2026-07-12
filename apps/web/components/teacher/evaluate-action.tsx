'use client'

import { cloneElement, useState, type ReactElement } from 'react'

import { EvaluateDialog, type EvaluateDialogTarget } from '@/components/teacher/evaluate-dialog'

interface EvaluateActionProps extends EvaluateDialogTarget {
  batchId: string
  trigger: ReactElement<{ onClick?: () => void }>
}

// Self-contained trigger + dialog for a single fixed target (a roster row's current chapter, or
// the student history page). For a shared dialog driven by many dynamic targets — e.g. matrix
// cells — render EvaluateDialog directly with lifted state instead.
export function EvaluateAction({ batchId, trigger, ...target }: EvaluateActionProps) {
  const [open, setOpen] = useState(false)

  return (
    <>
      {cloneElement(trigger, { onClick: () => setOpen(true) })}
      <EvaluateDialog batchId={batchId} open={open} onOpenChange={setOpen} target={target} />
    </>
  )
}
