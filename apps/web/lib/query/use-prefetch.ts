'use client'

import { useEffect, useRef } from 'react'
import { useQueryClient, type FetchQueryOptions, type QueryKey } from '@tanstack/react-query'

/**
 * Warm a query on pointer intent.
 *
 * The gap between hovering a row and clicking it is a few hundred milliseconds
 * of otherwise idle time, and it is almost exactly the latency of the request
 * the click is about to trigger. Spending it means the destination is usually
 * already in cache on arrival.
 *
 * `prefetchQuery` is a no-op when the data is present and fresh, so this costs
 * nothing on a second hover and cannot stampede the API. The small delay stops a
 * pointer travelling *across* a long list from firing a request per row it
 * passes over — the failure mode that turns a nicety into a burst of traffic.
 *
 * Generic in all four query parameters rather than taking a widened option
 * type: `queryOptions()` returns a key branded with the data it resolves to, and
 * flattening that to `unknown` makes `prefetchQuery` reject it outright, since
 * its generics are contravariant in the key.
 *
 * The handlers are intentionally *not* memoised. They close over an options
 * object rebuilt every render, so `useCallback` could only keep them stable by
 * mirroring that object into a ref and writing it during render — a render-phase
 * mutation React explicitly warns against, to save re-attaching two listeners on
 * a handful of rows.
 */
export function usePrefetch<
  TQueryFnData = unknown,
  TError = Error,
  TData = TQueryFnData,
  TQueryKey extends QueryKey = QueryKey,
>(options: FetchQueryOptions<TQueryFnData, TError, TData, TQueryKey>, delayMs = 80) {
  const queryClient = useQueryClient()
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // A row unmounted mid-hover (a filter narrowing the list) must not leave a
  // timer behind that fires a request for a row nobody is looking at.
  useEffect(() => {
    return () => {
      if (timer.current) clearTimeout(timer.current)
    }
  }, [])

  function start() {
    if (timer.current) return
    timer.current = setTimeout(() => {
      timer.current = null
      void queryClient.prefetchQuery(options)
    }, delayMs)
  }

  function cancel() {
    if (!timer.current) return
    clearTimeout(timer.current)
    timer.current = null
  }

  // Touch has no hover, so the same intent arrives as a pointer-down that will
  // be followed by a tap.
  return {
    onMouseEnter: start,
    onMouseLeave: cancel,
    onFocus: start,
    onBlur: cancel,
    onPointerDown: start,
  }
}
