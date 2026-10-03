import { describe, expect, it } from 'vitest'

import { HORIZON_WEEKS, occurrencesAfter } from './occurrences'

const saturdayTenAm = {
  dayOfWeek: 6,
  startTime: '10:00:00',
  timeZone: 'America/New_York',
  slotCount: 1,
  slotMinutes: 30,
}

describe('occurrencesAfter', () => {
  it('produces one sitting per matching weekday across the horizon', () => {
    // Wednesday 2026-10-07 UTC
    const result = occurrencesAfter(saturdayTenAm, new Date('2026-10-07T12:00:00Z'))

    expect(result).toHaveLength(HORIZON_WEEKS)
    // Saturday 2026-10-10 10:00 EDT (UTC-4)
    expect(result[0]!.toISOString()).toBe('2026-10-10T14:00:00.000Z')
  })

  it('spaces multiple sittings by slotMinutes', () => {
    const result = occurrencesAfter(
      { ...saturdayTenAm, slotCount: 3, slotMinutes: 45 },
      new Date('2026-10-07T12:00:00Z'),
    )

    expect(result.slice(0, 3).map(d => d.toISOString())).toEqual([
      '2026-10-10T14:00:00.000Z',
      '2026-10-10T14:45:00.000Z',
      '2026-10-10T15:30:00.000Z',
    ])
  })

  it('keeps the local wall-clock time across a daylight-saving change', () => {
    // US DST ends Sunday 2026-11-01: Saturday 10-31 is EDT (UTC-4), Saturday 11-07 is EST (UTC-5).
    const result = occurrencesAfter(saturdayTenAm, new Date('2026-10-28T12:00:00Z'))

    expect(result[0]!.toISOString()).toBe('2026-10-31T14:00:00.000Z')
    expect(result[1]!.toISOString()).toBe('2026-11-07T15:00:00.000Z')
  })

  it('skips sittings that have already started', () => {
    // Saturday 2026-10-10 10:30 EDT — after the first 10:00 sitting but before the 10:45 one
    const result = occurrencesAfter(
      { ...saturdayTenAm, slotCount: 2, slotMinutes: 45 },
      new Date('2026-10-10T14:30:00Z'),
    )

    expect(result[0]!.toISOString()).toBe('2026-10-10T14:45:00.000Z')
  })

  it('resolves the weekday in the rule\'s time zone, not UTC', () => {
    // 2026-10-10 03:00 UTC is still Friday 23:00 in New York, so Saturday is the next day there.
    const result = occurrencesAfter(saturdayTenAm, new Date('2026-10-10T03:00:00Z'))

    expect(result[0]!.toISOString()).toBe('2026-10-10T14:00:00.000Z')
  })
})
