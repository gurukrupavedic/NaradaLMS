import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { MIN_EDIT_DURATION_MS, withMinimumDuration } from './min-duration'

beforeEach(() => {
  vi.useFakeTimers()
})

afterEach(() => {
  vi.useRealTimers()
})

// Resolves to whether `promise` has settled yet, without changing when it does.
function track(promise: Promise<unknown>) {
  const state = { settled: false }
  promise.then(
    () => (state.settled = true),
    () => (state.settled = true),
  )
  return state
}

describe('withMinimumDuration', () => {
  it('holds a fast success until the minimum has passed, then returns its value', async () => {
    const result = withMinimumDuration(() => Promise.resolve('done'))
    const state = track(result)

    await vi.advanceTimersByTimeAsync(MIN_EDIT_DURATION_MS - 1)
    expect(state.settled).toBe(false)

    await vi.advanceTimersByTimeAsync(1)
    expect(state.settled).toBe(true)
    await expect(result).resolves.toBe('done')
  })

  it('holds a fast failure the same way, then rethrows it', async () => {
    const result = withMinimumDuration(() => Promise.reject(new Error('nope')))
    const assertion = expect(result).rejects.toThrow('nope')
    const state = track(result)

    await vi.advanceTimersByTimeAsync(MIN_EDIT_DURATION_MS - 1)
    expect(state.settled).toBe(false)

    await vi.advanceTimersByTimeAsync(1)
    expect(state.settled).toBe(true)
    await assertion
  })

  it('adds nothing on top of work that is already slower than the minimum', async () => {
    const slow = new Promise<string>(resolve => setTimeout(() => resolve('slow'), 900))
    const result = withMinimumDuration(() => slow)
    const state = track(result)

    await vi.advanceTimersByTimeAsync(899)
    expect(state.settled).toBe(false)

    await vi.advanceTimersByTimeAsync(1)
    expect(state.settled).toBe(true)
    await expect(result).resolves.toBe('slow')
  })
})
