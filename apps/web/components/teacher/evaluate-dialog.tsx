'use client'

import { useState, useTransition } from 'react'
import { toast } from 'sonner'

import { saveEvaluation } from '@/lib/teacher-actions'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { ProficiencyBadge } from '@/components/proficiency-badge'
import { getProficiencyConfig, PROFICIENCY_LEVELS, type ProficiencyLevel } from '@/lib/proficiency'
import { cn } from '@/lib/utils'

const EVALUATION_LEVELS = PROFICIENCY_LEVELS.filter(level => level !== 'notStarted')

export interface EvaluateDialogTarget {
  studentId: string
  studentName: string
  chapterId: string
  chapterCode: string
  chapterTitle: string
  initialLevel: ProficiencyLevel
  initialNotes: string
}

interface EvaluateDialogProps {
  batchId: string
  open: boolean
  onOpenChange: (open: boolean) => void
  target: EvaluateDialogTarget | null
}

// Fully controlled — the caller owns open state and the current target. Use EvaluateAction
// instead when a single self-contained trigger button + dialog is all a call site needs.
export function EvaluateDialog({ batchId, open, onOpenChange, target }: EvaluateDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md" aria-describedby="evaluate-dialog-description">
        {target && (
          <EvaluateForm
            // Remounts the form (and its draft state) whenever a new cell/row is targeted.
            key={`${target.studentId}:${target.chapterId}`}
            batchId={batchId}
            target={target}
            onSaved={() => onOpenChange(false)}
            onCancel={() => onOpenChange(false)}
          />
        )}
      </DialogContent>
    </Dialog>
  )
}

function EvaluateForm({
  batchId,
  target,
  onSaved,
  onCancel,
}: {
  batchId: string
  target: EvaluateDialogTarget
  onSaved: () => void
  onCancel: () => void
}) {
  const [level, setLevel] = useState<ProficiencyLevel>(
    target.initialLevel === 'notStarted' ? 'practicing' : target.initialLevel,
  )
  const [notes, setNotes] = useState(target.initialNotes)
  const [pending, startTransition] = useTransition()

  function handleSave() {
    startTransition(async () => {
      await saveEvaluation({
        batchId,
        studentId: target.studentId,
        chapterId: target.chapterId,
        level,
        notes,
      })
      toast.success('Evaluation saved', {
        description: `${target.studentName} — ${target.chapterCode} ${target.chapterTitle}`,
      })
      onSaved()
    })
  }

  return (
    <>
      <DialogHeader>
        <DialogTitle>Evaluate proficiency</DialogTitle>
        <DialogDescription id="evaluate-dialog-description">
          {target.studentName} — {target.chapterCode} {target.chapterTitle}
        </DialogDescription>
      </DialogHeader>

      <div className="space-y-4">
        <div className="space-y-2">
          <p className="text-xs uppercase tracking-wider text-muted-foreground">
            Proficiency level
          </p>
          <div className="grid grid-cols-2 gap-1.5">
            {EVALUATION_LEVELS.map(candidateLevel => {
              const config = getProficiencyConfig(candidateLevel)
              const selected = level === candidateLevel
              return (
                <button
                  key={candidateLevel}
                  type="button"
                  aria-pressed={selected}
                  onClick={() => setLevel(candidateLevel)}
                  className={cn(
                    'flex items-center gap-2 border px-3 py-2 text-left text-xs transition-colors',
                    selected
                      ? 'border-primary bg-primary/10 ring-1 ring-primary/20'
                      : 'border-border hover:bg-muted/60',
                  )}
                >
                  <ProficiencyBadge level={candidateLevel} compact />
                  <span>{config.label}</span>
                </button>
              )
            })}
          </div>
        </div>

        <div className="space-y-2">
          <label
            htmlFor="evaluate-notes"
            className="block text-xs uppercase tracking-wider text-muted-foreground"
          >
            Notes (optional)
          </label>
          <textarea
            id="evaluate-notes"
            value={notes}
            onChange={event => setNotes(event.target.value)}
            rows={4}
            placeholder="Capture pronunciation, svara, memory, or next assignment."
            className="min-h-20 w-full resize-none border border-border bg-background px-3 py-2 text-sm outline-none transition-colors placeholder:text-muted-foreground focus:border-primary"
          />
        </div>
      </div>

      <DialogFooter>
        <Button variant="outline" size="sm" onClick={onCancel}>
          Cancel
        </Button>
        <Button size="sm" onClick={handleSave} disabled={pending}>
          {pending ? 'Saving…' : 'Save evaluation'}
        </Button>
      </DialogFooter>
    </>
  )
}
