import fs from 'node:fs'
import path from 'node:path'

import { Pool } from 'pg'
import { afterEach, describe, expect, it } from 'vitest'

import {
  dropSchoolSchema,
  getSchoolDb,
  migrateExistingSchool,
  needsLegacyMigrationBackfill,
  quotePgIdentifier,
  schoolSchemaName,
} from '@narada/db'

import { newOrgId } from '../ids'
import { resolveMigrationsFolder } from '../migrate'

/**
 * Simulates a school provisioned before H1 added per-schema migration tracking: its schema has
 * real tables (from the first ever school migration) but no `<schema>.__drizzle_migrations`
 * table of its own — the exact state the real dev database's one pre-H1 school was found in.
 * Applies only the school schema's first journal-listed migration by hand, via a raw pool, and
 * deliberately never creates a tracking table, so `migrateExistingSchool`'s backfill path is the
 * only thing that can bring it up to date.
 */
async function createLegacyPreH1Schema(): Promise<string> {
  const orgId = newOrgId()
  const schemaName = schoolSchemaName(orgId)
  const migrationsFolder = resolveMigrationsFolder('school')
  const journal = JSON.parse(
    fs.readFileSync(path.join(migrationsFolder, 'meta/_journal.json'), 'utf8'),
  ) as { entries: { tag: string }[] }
  const firstMigration = journal.entries[0]
  if (!firstMigration) throw new Error('school migrations folder has no journal entries')

  const migrationSql = fs.readFileSync(
    path.join(migrationsFolder, `${firstMigration.tag}.sql`),
    'utf8',
  )

  const pool = new Pool({ connectionString: process.env.DATABASE_URL })
  try {
    await pool.query(`CREATE SCHEMA ${quotePgIdentifier(schemaName)}`)
    for (const statement of migrationSql.split('--> statement-breakpoint')) {
      await pool.query(`SET search_path TO ${quotePgIdentifier(schemaName)}`)
      await pool.query(statement)
    }
  } finally {
    await pool.end()
  }

  return orgId
}

describe('legacy pre-H1 school migration backfill', () => {
  let orgId: string | undefined

  afterEach(async () => {
    if (orgId) {
      await dropSchoolSchema(orgId)
      orgId = undefined
    }
  })

  it('backfills tracking for a legacy schema, then applies every migration still pending', async () => {
    orgId = await createLegacyPreH1Schema()

    await expect(needsLegacyMigrationBackfill(orgId)).resolves.toBe(true)

    const result = await migrateExistingSchool(orgId)
    expect(result).toEqual({ backfilledLegacyTracking: true })

    await expect(needsLegacyMigrationBackfill(orgId)).resolves.toBe(false)

    const schoolDb = getSchoolDb(orgId)
    const columns = await schoolDb.query.profile.findMany({ limit: 0 })
    expect(columns).toEqual([]) // just proves the query against the now-migrated schema succeeds

    const pool = new Pool({ connectionString: process.env.DATABASE_URL })
    try {
      const schemaName = schoolSchemaName(orgId)
      const profileColumns = await pool.query<{ column_name: string }>(
        `SELECT column_name FROM information_schema.columns
         WHERE table_schema = $1 AND table_name = 'profile'`,
        [schemaName],
      )
      expect(profileColumns.rows.map(row => row.column_name)).toContain('deletedAt')

      const examColumns = await pool.query<{ column_name: string }>(
        `SELECT column_name FROM information_schema.columns
         WHERE table_schema = $1 AND table_name = 'exam'`,
        [schemaName],
      )
      expect(examColumns.rows.map(row => row.column_name)).toContain('batchId')
    } finally {
      await pool.end()
    }
  })

  it('is idempotent: a second call backfills nothing and applies nothing new', async () => {
    orgId = await createLegacyPreH1Schema()

    await migrateExistingSchool(orgId)
    const second = await migrateExistingSchool(orgId)

    expect(second).toEqual({ backfilledLegacyTracking: false })
  })

  it('a schema already on the new tracking scheme needs no backfill', async () => {
    orgId = await createLegacyPreH1Schema()
    await migrateExistingSchool(orgId) // brings it onto the new scheme

    await expect(needsLegacyMigrationBackfill(orgId)).resolves.toBe(false)
  })
})
