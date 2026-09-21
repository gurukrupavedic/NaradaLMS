'use client'

import { Toast } from '@base-ui/react/toast'

import { cn } from '@/lib/utils'
import { toastManager } from '@/lib/toast'

/**
 * Mounted once, in the root layout, so a toast survives the drawer or dialog that triggered it
 * closing (or the page navigating away). Built on Base UI's Toast — the same primitive family the
 * app's `Dialog`/`Drawer` already use — which brings the pause-on-hover, swipe-to-dismiss, F6
 * focus hotkey and live-region announcement for free; only the look is ours: a ruled paper slip
 * with a keyline down its left edge (ink for done, vermilion for a failure), no icons, glow or
 * blur.
 */
export function Toaster() {
  return (
    <Toast.Provider toastManager={toastManager} limit={4}>
      <Toast.Portal>
        {/* Above the Drawer/Dialog popups (z-50), so a toast raised from inside one is visible. */}
        <Toast.Viewport className="fixed inset-x-4 bottom-4 z-[70] flex flex-col gap-2 sm:right-6 sm:bottom-6 sm:left-auto sm:w-[22rem]">
          <ToastList />
        </Toast.Viewport>
      </Toast.Portal>
    </Toast.Provider>
  )
}

function ToastList() {
  const { toasts } = Toast.useToastManager<{ tone: 'success' | 'error' }>()

  return toasts.map(toast => (
    <Toast.Root
      key={toast.id}
      toast={toast}
      className={cn(
        'relative border border-l-[3px] border-rule bg-card px-4 py-3 shadow-md transition-[opacity,transform] duration-200',
        'data-[starting-style]:translate-y-3 data-[starting-style]:opacity-0',
        'data-[ending-style]:translate-y-3 data-[ending-style]:opacity-0',
        toast.data?.tone === 'error' ? 'border-l-vermilion' : 'border-l-ink',
      )}
    >
      <Toast.Content className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <Toast.Title className="text-[0.875rem] leading-snug" />
          <Toast.Description className="mt-1 text-[0.8125rem] leading-snug text-ink-muted" />
        </div>
        <Toast.Close
          aria-label="Dismiss"
          className="label shrink-0 text-ink-muted transition-colors hover:text-vermilion"
        >
          Close
        </Toast.Close>
      </Toast.Content>
    </Toast.Root>
  ))
}
