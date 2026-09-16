'use client'

import { Dialog } from '@base-ui/react/dialog'

import { cn } from '@/lib/utils'

/**
 * A side panel for a focused task that still wants room to work in — search results, a roster
 * pick list — rather than the small, centered `Dialog` pattern (components/grade-dialog.tsx) built
 * for a single short form. Same base-ui primitives, different popup placement/motion: a sheet that
 * rises from the bottom edge on a narrow viewport (where a right-edge panel would be full-width
 * anyway, and "up" is the natural direction for a sheet that started from a tap near the bottom of
 * the screen), sliding in from the right instead at `sm:` and up.
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
            // Mobile: a bottom sheet, full width, capped height.
            'fixed inset-x-0 bottom-0 top-auto z-50 flex max-h-[85vh] w-full flex-col',
            'border-t border-rule bg-card p-5 shadow-md outline-none',
            'transition-transform duration-200 data-[ending-style]:translate-y-full data-[starting-style]:translate-y-full',
            // sm and up: a right-edge panel, full height, capped width.
            'sm:inset-y-0 sm:top-0 sm:right-0 sm:bottom-auto sm:left-auto sm:h-full sm:max-h-none sm:w-[calc(100%-2.5rem)] sm:max-w-md',
            'sm:border-t-0 sm:border-l',
            'sm:data-[ending-style]:translate-x-full sm:data-[ending-style]:translate-y-0 sm:data-[starting-style]:translate-x-full sm:data-[starting-style]:translate-y-0',
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
