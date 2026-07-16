import type { ApiClassSlot } from '@/lib/types'

// Assumes the process runs in the school's own timezone (no per-batch/per-slot timezone yet —
// see docs/class-schedule-plan.md). Date#getDay()/setHours() below operate in that local time.
export function getNextOccurrence(slots: ApiClassSlot[], now: Date = new Date()): Date | null {
  if (slots.length === 0) return null

  return slots
    .map(slot => nextOccurrenceForSlot(slot, now))
    .reduce((soonest, candidate) => (candidate < soonest ? candidate : soonest))
}

function nextOccurrenceForSlot(slot: ApiClassSlot, now: Date): Date {
  const [hours, minutes] = slot.time.split(':').map(Number)
  const dayDiff = (slot.dayOfWeek - now.getDay() + 7) % 7

  const candidate = new Date(now)
  candidate.setDate(candidate.getDate() + dayDiff)
  candidate.setHours(hours, minutes, 0, 0)

  if (candidate < now) {
    candidate.setDate(candidate.getDate() + 7)
  }

  return candidate
}
