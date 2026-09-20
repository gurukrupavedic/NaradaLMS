'use client'

import {
  useMutation,
  type MutationFunction,
  type UseMutationOptions,
  type UseMutationResult,
} from '@tanstack/react-query'

import { ApiError } from '@/lib/api/client'
import { withMinimumDuration } from '@/lib/min-duration'
import { notify } from '@/lib/toast'

type Message<TVariables> = string | ((variables: TVariables) => string)

type Feedback<TData, TVariables> = {
  /** What the success toast says. */
  success: string | ((data: TData, variables: TVariables) => string)
  /** The failure toast's headline — the server's own message, when it sent one, goes underneath. */
  failure: Message<TVariables>
}

/**
 * `useMutation` for an edit a person deliberately made (moving or adding a student, saving a
 * profile, approving a request): held to at least `MIN_EDIT_DURATION_MS` (lib/min-duration.ts) —
 * `isPending` is what drives the button's spinner — and ended with a toast either way. Everything else
 * (`onSuccess` invalidation, `onMutate`, …) behaves exactly as it does on a plain `useMutation`.
 *
 * Not for the catalog editor's optimistic mutations (`use-catalog-mutations.ts`): those are a
 * burst of small edits that write to the cache first so the page feels instant, and a half-second
 * hold plus a toast per reorder click would work against that.
 */
export function useEditMutation<TData, TVariables, TOnMutateResult = unknown>(
  options: Omit<UseMutationOptions<TData, Error, TVariables, TOnMutateResult>, 'mutationFn'> & {
    mutationFn: MutationFunction<TData, TVariables>
  },
  feedback: Feedback<TData, TVariables>,
): UseMutationResult<TData, Error, TVariables, TOnMutateResult> {
  return useMutation({
    ...options,
    mutationFn: (variables, context) =>
      withMinimumDuration(() => options.mutationFn(variables, context)),
    onSuccess: (data, variables, onMutateResult, context) => {
      notify.success(
        typeof feedback.success === 'function' ? feedback.success(data, variables) : feedback.success,
      )
      return options.onSuccess?.(data, variables, onMutateResult, context)
    },
    onError: (error, variables, onMutateResult, context) => {
      notify.error(
        typeof feedback.failure === 'function' ? feedback.failure(variables) : feedback.failure,
        error instanceof ApiError ? error.message : undefined,
      )
      return options.onError?.(error, variables, onMutateResult, context)
    },
  })
}
