import { describe, expect, it } from 'vitest'

import type { ApiClassSlot } from '@/lib/types'

import { getNextOccurrence } from './schedule'

describe('getNextOccurrence', () => {
  it('returns null when there are no slots', () => {
    expect(getNextOccurrence([], new Date('2026-07-16T12:00:00'))).toBeNull()
  })

  it('picks today\'s slot when it is still ahead of now', () => {
    // 2026-07-16 is a Thursday (dayOfWeek 4)
    const slots: ApiClassSlot[] = [{ dayOfWeek: 4, time: '18:00', durationMinutes: 60 }]
    const now = new Date('2026-07-16T12:00:00')

    expect(getNextOccurrence(slots, now)).toEqual(new Date('2026-07-16T18:00:00'))
  })

  it('rolls over to next week when today\'s slot has already passed', () => {
    const slots: ApiClassSlot[] = [{ dayOfWeek: 4, time: '18:00', durationMinutes: 60 }]
    const now = new Date('2026-07-16T19:00:00')

    expect(getNextOccurrence(slots, now)).toEqual(new Date('2026-07-23T18:00:00'))
  })

  it('finds a slot a few days out', () => {
    // now is Thursday 2026-07-16; Monday 2026-07-20 is 4 days ahead
    const slots: ApiClassSlot[] = [{ dayOfWeek: 1, time: '09:00', durationMinutes: 60 }]
    const now = new Date('2026-07-16T12:00:00')

    expect(getNextOccurrence(slots, now)).toEqual(new Date('2026-07-20T09:00:00'))
  })

  it('picks the soonest slot across multiple slots, not the first one in the array', () => {
    // now is Thursday 2026-07-16 at noon. Listed out of soonest-first order on purpose.
    const slots: ApiClassSlot[] = [
      { dayOfWeek: 1, time: '18:00', durationMinutes: 60 }, // next Monday, 2026-07-20
      { dayOfWeek: 5, time: '18:00', durationMinutes: 60 }, // this Friday, 2026-07-17 — soonest
      { dayOfWeek: 4, time: '08:00', durationMinutes: 60 }, // today, but already passed
    ]
    const now = new Date('2026-07-16T12:00:00')

    expect(getNextOccurrence(slots, now)).toEqual(new Date('2026-07-17T18:00:00'))
  })
})
