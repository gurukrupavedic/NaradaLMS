import { TZDate } from '@date-fns/tz'

export type ScheduleRule = {
  dayOfWeek: number
  startTime: string // 'HH:MM' or 'HH:MM:SS', wall-clock in `timeZone`
  timeZone: string
  slotCount: number
  slotMinutes: number
}

/** How far ahead slots are generated — a student sees roughly this many weeks of availability. */
export const HORIZON_WEEKS = 8

/**
 * Every sitting `rule` produces after `from` and within the next `HORIZON_WEEKS` weeks, as instants
 * in ascending order. The calendar day and the wall-clock time are both resolved in the rule's own
 * time zone (via `TZDate`), so "Saturday 10:00" stays 10:00 local across a daylight-saving change.
 */
export function occurrencesAfter(rule: ScheduleRule, from: Date): Date[] {
  const [hours, minutes] = rule.startTime.split(':').map(Number) as [number, number]
  const today = new TZDate(from, rule.timeZone)
  const result: Date[] = []

  for (let offset = 0; offset < HORIZON_WEEKS * 7; offset++) {
    const day = new TZDate(today.getFullYear(), today.getMonth(), today.getDate() + offset, rule.timeZone)
    if (day.getDay() !== rule.dayOfWeek) continue

    for (let i = 0; i < rule.slotCount; i++) {
      const slot = new TZDate(
        day.getFullYear(),
        day.getMonth(),
        day.getDate(),
        hours,
        minutes + i * rule.slotMinutes,
        0,
        0,
        rule.timeZone,
      )
      if (slot.getTime() > from.getTime()) result.push(new Date(slot.getTime()))
    }
  }

  return result
}
