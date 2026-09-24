/** "1 batch", "2 batches" — the count with its noun agreeing in number. Pass `plural` for irregular nouns. */
export function pluralize(count: number, singular: string, plural = `${singular}s`): string {
  return `${count} ${count === 1 ? singular : plural}`
}
