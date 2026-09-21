import { Toast } from '@base-ui/react/toast'

/**
 * The one toast manager for the app, created outside React so a mutation hook
 * (lib/query/use-edit-mutation.ts) can raise a toast without holding a component's context —
 * `components/toaster.tsx` hands this same instance to `Toast.Provider`, which is what renders
 * whatever gets added here.
 */
export const toastManager = Toast.createToastManager<{ tone: 'success' | 'error' }>()

// A failure is the one message a person has to actually read, so it stays up longer and is
// announced assertively (`priority: 'high'` makes Base UI use an assertive live region).
const SUCCESS_TIMEOUT_MS = 4000
const ERROR_TIMEOUT_MS = 8000

export const notify = {
  success(title: string) {
    toastManager.add({ title, timeout: SUCCESS_TIMEOUT_MS, data: { tone: 'success' } })
  },
  error(title: string, description?: string) {
    toastManager.add({
      title,
      description,
      timeout: ERROR_TIMEOUT_MS,
      priority: 'high',
      data: { tone: 'error' },
    })
  },
}
