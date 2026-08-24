import { describe, expect, it } from 'vitest'

import type { ApiBatchDetail, ApiTrack } from '@/lib/types'

import {
  buildAdminRows,
  compareCodes,
  describeSetupGaps,
  filterAdminRows,
  summarizeSchool,
  type AdminBatchRow,
} from './admin-view'

function track(order: number, name = `Track ${order}`): ApiTrack {
  return { id: `t${order}`, order, name, chapters: [] } as unknown as ApiTrack
}

function batch(overrides: Partial<ApiBatchDetail> & { code: string }): ApiBatchDetail {
  return {
    id: overrides.code,
    trackId: overrides.trackId ?? 't1',
    code: overrides.code,
    status: overrides.status ?? 'active',
    startDate: overrides.startDate ?? null,
    meetingUrl: overrides.meetingUrl ?? null,
    members: overrides.members ?? [],
    classSlots: overrides.classSlots ?? [],
  } as ApiBatchDetail
}

function member(name: string, role: 'student' | 'instructor' | 'ta') {
  return { profileId: name, name, phone: null, city: null, role, joinedAt: null }
}

function row(overrides: Partial<AdminBatchRow>): AdminBatchRow {
  return {
    id: 'b',
    code: 'b',
    status: 'active',
    trackOrder: 1,
    track: 'Track 1',
    startDate: null,
    studentCount: 0,
    teachers: [],
    hasMeetingUrl: true,
    hasSchedule: true,
    ...overrides,
  }
}

describe('compareCodes', () => {
  // Plain string ordering put GR-11 and GR-13 ahead of GR-2 in the real batch list.
  it('orders trailing group numbers numerically', () => {
    const sorted = ['VED-01-2026-GR-11', 'VED-01-2026-GR-2', 'VED-01-2026-GR-1'].sort(compareCodes)

    expect(sorted).toEqual(['VED-01-2026-GR-1', 'VED-01-2026-GR-2', 'VED-01-2026-GR-11'])
  })
})

describe('buildAdminRows', () => {
  it('counts students separately from teaching staff', () => {
    const [built] = buildAdminRows(
      [
        batch({
          code: 'B',
          members: [
            member('Asha', 'student'),
            member('Ravi', 'student'),
            member('Guru', 'instructor'),
            member('Tara', 'ta'),
          ],
        }),
      ],
      [track(1)],
    )

    expect(built.studentCount).toBe(2)
    expect(built.teachers).toEqual(['Guru', 'Tara'])
  })

  it('does not repeat the ordinal when the track name is just "Track N"', () => {
    const [built] = buildAdminRows([batch({ code: 'B' })], [track(1)])

    expect(built.track).toBe('Track 1')
  })

  it('sorts by track order, then by code numerically', () => {
    const rows = buildAdminRows(
      [
        batch({ code: 'VED-02-GR-1', trackId: 't2' }),
        batch({ code: 'VED-01-GR-11', trackId: 't1' }),
        batch({ code: 'VED-01-GR-2', trackId: 't1' }),
      ],
      [track(1), track(2)],
    )

    expect(rows.map(r => r.code)).toEqual(['VED-01-GR-2', 'VED-01-GR-11', 'VED-02-GR-1'])
  })

  it('survives a batch whose track is missing rather than dropping it', () => {
    const [built] = buildAdminRows([batch({ code: 'ORPHAN', trackId: 'gone' })], [track(1)])

    expect(built.track).toBe('Unknown track')
  })
})

describe('summarizeSchool', () => {
  it('totals students across every batch and counts only active setup gaps', () => {
    const summary = summarizeSchool([
      row({ status: 'active', studentCount: 10, hasMeetingUrl: false, hasSchedule: false }),
      row({ status: 'active', studentCount: 5, trackOrder: 2 }),
      row({ status: 'completed', studentCount: 7, hasMeetingUrl: false }),
    ])

    expect(summary).toEqual({
      total: 3,
      active: 2,
      students: 22,
      tracks: 2,
      activeMissingJoinLink: 1,
      activeMissingSchedule: 1,
    })
  })
})

describe('describeSetupGaps', () => {
  it('says "none" when every active batch is missing something', () => {
    const summary = summarizeSchool([
      row({ hasMeetingUrl: false, hasSchedule: false }),
      row({ hasMeetingUrl: false, hasSchedule: false }),
    ])

    expect(describeSetupGaps(summary)).toBe(
      'Of 2 active batches, none have a join link and none have a schedule.',
    )
  })

  it('counts them when only some are missing', () => {
    const summary = summarizeSchool([row({ hasMeetingUrl: false }), row({})])

    expect(describeSetupGaps(summary)).toBe('Of 2 active batches, 1 have no join link.')
  })

  it('says nothing when everything is configured', () => {
    expect(describeSetupGaps(summarizeSchool([row({})]))).toBeNull()
  })
})

describe('filterAdminRows', () => {
  const rows = [
    row({ code: 'VED-01-2026-GR-1', track: 'Track 1', teachers: ['Pedda Guruvu Garu'] }),
    row({ code: 'VED-05-2026-GR-3', track: 'Track 5', teachers: ['Chinna Guruvu Garu'] }),
  ]

  it('matches on batch code', () => {
    expect(filterAdminRows(rows, 'gr-3').map(r => r.code)).toEqual(['VED-05-2026-GR-3'])
  })

  it('matches on track and on teacher name', () => {
    expect(filterAdminRows(rows, 'track 5')).toHaveLength(1)
    expect(filterAdminRows(rows, 'pedda')).toHaveLength(1)
  })

  it('returns everything for an empty query', () => {
    expect(filterAdminRows(rows, '   ')).toHaveLength(2)
  })
})
