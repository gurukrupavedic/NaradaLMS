import { sql } from 'drizzle-orm'
import { Pool } from 'pg'
import { afterEach, describe, expect, it } from 'vitest'

import { publicDb, track } from '@narada/db'

import { destroyTestWorld } from '../cleanup'
import { issuePending, withTwoConnections } from '../concurrency'
import { createProfile, createTestSchool, type TestWorld } from '../fixtures'

let world: TestWorld | undefined

afterEach(async () => {
  if (world) {
    await destroyTestWorld(world)
    world = undefined
  }
})

describe('createTestSchool', () => {
  it('creates a real, isolated schema that shows up in information_schema.schemata', async () => {
    world = await createTestSchool()

    const rows = await publicDb.execute<{ schema_name: string }>(
      sql`SELECT schema_name FROM information_schema.schemata WHERE schema_name = ${world.schemaName}`,
    )

    expect(rows.rows).toHaveLength(1)
  })

  it('provisions a schema that a profile can actually be inserted into and read back from', async () => {
    world = await createTestSchool()

    const created = await createProfile(world, { name: 'Ada Lovelace' })
    const found = await world.schoolDb.query.profile.findFirst({
      where: (t, { eq }) => eq(t.id, created.id),
    })

    expect(found?.name).toBe('Ada Lovelace')
  })
})

describe('destroyTestWorld', () => {
  it('drops the school schema and deletes the public organization row', async () => {
    const w = await createTestSchool()
    await createProfile(w)

    await destroyTestWorld(w)
    world = undefined // already destroyed; don't double-destroy in afterEach

    const schemaRows = await publicDb.execute<{ schema_name: string }>(
      sql`SELECT schema_name FROM information_schema.schemata WHERE schema_name = ${w.schemaName}`,
    )
    expect(schemaRows.rows).toHaveLength(0)

    const org = await publicDb.query.organization.findFirst({
      where: (t, { eq }) => eq(t.id, w.orgId),
    })
    expect(org).toBeUndefined()
  })
})

describe('barrier proof: two real Postgres connections, a genuine blocking UPDATE', () => {
  it("serializes two UPDATEs of the same row: B's UPDATE is observed to actually be lock-blocked in pg_stat_activity, then unblocks only once A commits", async () => {
    world = await createTestSchool()
    const trackRows = await world.schoolDb
      .insert(track)
      .values({ name: 'Concurrency Track', order: 1 })
      .returning()
    const trackRow = trackRows.at(0)
    if (!trackRow) throw new Error('setup failed')

    // A third, independent connection used only to observe server-side lock-wait state — this is
    // the deterministic proof of blocking (no sleep/pg_sleep/timer involved): we poll
    // pg_stat_activity, itself a real query against the live server, until B's backend PID shows
    // up waiting on a lock.
    const monitorPool = new Pool({ connectionString: process.env.DATABASE_URL })

    const order: string[] = []

    try {
      await withTwoConnections(world.schemaName, async (connA, connB) => {
        await connA.begin()
        await connB.begin()

        const bPidResult = await connB.query('SELECT pg_backend_pid() AS pid')
        const bPid = bPidResult.rows[0].pid as number

        // A updates the row and holds the row lock inside its still-open transaction.
        await connA.query('UPDATE track SET name = $1 WHERE id = $2', ['Name From A', trackRow.id])
        order.push('A updated')

        // B's UPDATE of the same row must block on A's uncommitted row lock. Issue it without
        // awaiting so we can observe the blocked state before it resolves.
        const bUpdatePromise = issuePending(connB, 'UPDATE track SET name = $1 WHERE id = $2', [
          'Name From B',
          trackRow.id,
        ])

        // Poll (bounded, via real DB round trips — not a timer) until Postgres itself reports
        // B's backend is waiting on a lock.
        let observedBlocked = false
        for (let attempt = 0; attempt < 500 && !observedBlocked; attempt++) {
          const activity = await monitorPool.query(
            'SELECT wait_event_type FROM pg_stat_activity WHERE pid = $1',
            [bPid],
          )
          observedBlocked = activity.rows[0]?.wait_event_type === 'Lock'
        }

        expect(observedBlocked).toBe(true)
        order.push('B observed blocked on a lock held by A')

        order.push('A committing')
        await connA.commit()

        // Only now can B's blocked UPDATE proceed and resolve.
        await bUpdatePromise
        order.push('B updated (unblocked by A commit)')
        await connB.commit()
      })
    } finally {
      await monitorPool.end()
    }

    expect(order).toEqual([
      'A updated',
      'B observed blocked on a lock held by A',
      'A committing',
      'B updated (unblocked by A commit)',
    ])

    const finalRow = await world.schoolDb.query.track.findFirst({
      where: (t, { eq }) => eq(t.id, trackRow.id),
    })
    // B committed last, so B's write is the one that persists — a deterministic winner.
    expect(finalRow?.name).toBe('Name From B')
  })
})
