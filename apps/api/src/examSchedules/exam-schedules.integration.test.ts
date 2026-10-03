import { afterEach, describe, expect, it } from 'vitest'
import { and, eq } from 'drizzle-orm'

import { examSlot } from '@narada/db'

import type { AccessPolicy } from '../utils/accessPolicy'
import { destroyTestWorld } from '../testing/cleanup'
import {
  createProfile,
  createTestSchool,
  defaultCourseId,
  type TestWorld,
} from '../testing/fixtures'
import { HORIZON_WEEKS } from './occurrences'
import { create, ensureHorizon, remove, update } from './service'

// Authorization is covered by the service's own `requireCanCreateExam` call (and
// `accessPolicy.test.ts`); what's under test here is the real transactions against real Postgres.
const access = { requireCanCreateExam: () => undefined } as unknown as AccessPolicy

const rule = { dayOfWeek: 6, startTime: '10:00', timeZone: 'America/New_York', slotCount: 2, slotMinutes: 30 }

let world: TestWorld | undefined

afterEach(async () => {
  if (world) {
    await destroyTestWorld(world)
    world = undefined
  }
})

async function setup() {
  const w = await createTestSchool()
  world = w
  const admin = await createProfile(w, { name: 'Admin' })
  const courseId = await defaultCourseId(w)
  const context = { db: w.schoolDb, access }
  return { w, admin, courseId, context }
}

const slotsOf = (w: TestWorld, scheduleId: string) =>
  w.schoolDb.select().from(examSlot).where(eq(examSlot.scheduleId, scheduleId)).orderBy(examSlot.scheduledAt)

describe('create', () => {
  it('generates the rolling window of open slots', async () => {
    const { w, admin, courseId, context } = await setup()

    const schedule = await create(context, rule, admin.id, courseId)

    const slots = await slotsOf(w, schedule.id)
    // Two sittings per Saturday; the first Saturday may already be partly in the past.
    expect(slots.length).toBeGreaterThanOrEqual((HORIZON_WEEKS - 1) * 2)
    expect(slots.length).toBeLessThanOrEqual(HORIZON_WEEKS * 2)
    expect(slots.every(s => s.status === 'open' && s.courseId === courseId)).toBe(true)
  })
})

describe('ensureHorizon', () => {
  it('is idempotent', async () => {
    const { w, admin, courseId, context } = await setup()
    const schedule = await create(context, rule, admin.id, courseId)
    const before = (await slotsOf(w, schedule.id)).length

    await ensureHorizon(context, courseId)
    await ensureHorizon(context, courseId)

    expect((await slotsOf(w, schedule.id)).length).toBe(before)
  })

  it('rolls the window forward and never resurrects a cancelled sitting', async () => {
    const { w, admin, courseId, context } = await setup()
    const schedule = await create(context, rule, admin.id, courseId)
    const [first] = await slotsOf(w, schedule.id)
    await w.schoolDb.update(examSlot).set({ status: 'cancelled' }).where(eq(examSlot.id, first!.id))

    // A week later the window reaches one Saturday further out.
    const weekLater = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
    await ensureHorizon(context, courseId, weekLater)
    await ensureHorizon(context, courseId)

    const slots = await slotsOf(w, schedule.id)
    expect(slots.filter(s => s.scheduledAt.getTime() === first!.scheduledAt.getTime())).toHaveLength(1)
    expect(slots.find(s => s.id === first!.id)?.status).toBe('cancelled')
    expect(Math.max(...slots.map(s => s.scheduledAt.getTime()))).toBeGreaterThan(Date.now() + (HORIZON_WEEKS - 1) * 7 * 86_400_000)
  })
})

describe('update', () => {
  it('rebuilds open slots but keeps a claimed one at its old time, and reports it', async () => {
    const { w, admin, courseId, context } = await setup()
    const schedule = await create(context, rule, admin.id, courseId)
    const [claimed] = await slotsOf(w, schedule.id)
    await w.schoolDb.update(examSlot).set({ status: 'booked' }).where(eq(examSlot.id, claimed!.id))

    const result = await update(context, schedule.id, { ...rule, startTime: '14:00' }, courseId)

    expect(result.keptSlots).toBe(1)
    const slots = await slotsOf(w, schedule.id)
    expect(slots.find(s => s.id === claimed!.id)?.status).toBe('booked')
    const open = slots.filter(s => s.status === 'open')
    // 14:00 and 14:30 Eastern, in either EDT or EST.
    expect(open.every(s => [18, 19].includes(s.scheduledAt.getUTCHours()))).toBe(true)
    expect(open.length).toBeGreaterThanOrEqual((HORIZON_WEEKS - 1) * 2)
  })

  it('404s a schedule from another course', async () => {
    const { admin, courseId, context } = await setup()
    const schedule = await create(context, rule, admin.id, courseId)

    await expect(
      update(context, schedule.id, rule, '00000000-0000-7000-8000-000000000000'),
    ).rejects.toMatchObject({ statusCode: 404 })
  })
})

describe('remove', () => {
  it('deletes open future slots and detaches claimed ones as one-offs', async () => {
    const { w, admin, courseId, context } = await setup()
    const schedule = await create(context, rule, admin.id, courseId)
    const [claimed] = await slotsOf(w, schedule.id)
    await w.schoolDb.update(examSlot).set({ status: 'booked' }).where(eq(examSlot.id, claimed!.id))

    await remove(context, schedule.id, courseId)

    const remaining = await w.schoolDb.select().from(examSlot).where(and(eq(examSlot.courseId, courseId)))
    expect(remaining.map(s => s.id)).toEqual([claimed!.id])
    expect(remaining[0]!.scheduleId).toBeNull()
  })
})
