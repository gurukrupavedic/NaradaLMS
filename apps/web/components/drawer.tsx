'use client'

import { Dialog } from '@base-ui/react/dialog'

import { cn } from '@/lib/utils'

/**
 * A side panel for a focused task that still wants room to work in — search results, a roster
 * pick list — rather than the small, centered `Dialog` pattern (components/grade-dialog.tsx) built
 * for a single short form. Same base-ui primitives, different popup placement/motion: this slides
 * in from the right edge instead of scaling in at center.
 */
export function Drawer({
  open,
  onOpenChange,
  title,
  description,
  children,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description?: string
  children: React.ReactNode
}) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 z-40 bg-ink/40 data-[ending-style]:opacity-0 data-[starting-style]:opacity-0" />
        <Dialog.Popup
          className={cn(
            'fixed inset-y-0 right-0 z-50 flex w-[calc(100%-2.5rem)] max-w-md flex-col',
            'border-l border-rule bg-card p-5 shadow-md outline-none',
            'transition-transform duration-200 data-[ending-style]:translate-x-full data-[starting-style]:translate-x-full',
          )}
        >
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <Dialog.Title className="display text-[1.125rem]">{title}</Dialog.Title>
              {description && (
                <Dialog.Description className="mt-1 text-[0.8125rem] text-ink-muted">
                  {description}
                </Dialog.Description>
              )}
            </div>
            <Dialog.Close className="label shrink-0 text-ink-muted transition-colors hover:text-vermilion">
              Close
            </Dialog.Close>
          </div>

          <div className="mt-5 min-h-0 flex-1 overflow-y-auto">{children}</div>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
