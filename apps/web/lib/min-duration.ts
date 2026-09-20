/**
 * How long an edit takes at minimum, however fast the server answers. A write that comes back in
 * 60ms makes the button flicker and the toast appear before the person has registered clicking —
 * holding every edit to at least this long gives the spinner time to be seen and the outcome a
 * beat to land. It is deliberately artificial.
 */
export const MIN_EDIT_DURATION_MS = 500

/**
 * Runs `work`, but doesn't settle until at least `minMs` has passed — for a failure as much as a
 * success, so a request that errors instantly doesn't skip the spinner either. The floor runs
 * alongside the work rather than after it, so a request already slower than `minMs` isn't delayed
 * any further.
 */
export async function withMinimumDuration<T>(
  work: () => Promise<T>,
  minMs: number = MIN_EDIT_DURATION_MS,
): Promise<T> {
  const floor = new Promise<void>(resolve => setTimeout(resolve, minMs))
  try {
    return await work()
  } finally {
    await floor
  }
}
