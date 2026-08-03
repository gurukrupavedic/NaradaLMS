import { describe, expect, it } from 'vitest'

import { stripPublicSchemaQualifier } from './fixSchoolMigrationQualifiers'

describe('stripPublicSchemaQualifier', () => {
  it('strips the qualifier from a CREATE TYPE statement', () => {
    const input = `CREATE TYPE "public"."batchStatus" AS ENUM('upcoming', 'active', 'completed');`
    expect(stripPublicSchemaQualifier(input)).toBe(
      `CREATE TYPE "batchStatus" AS ENUM('upcoming', 'active', 'completed');`,
    )
  })

  it('strips the qualifier from a REFERENCES clause', () => {
    const input =
      'ALTER TABLE "batch" ADD CONSTRAINT "batch_trackId_track_id_fk" FOREIGN KEY ("trackId") ' +
      'REFERENCES "public"."track"("id") ON DELETE no action ON UPDATE no action;'
    expect(stripPublicSchemaQualifier(input)).toBe(
      'ALTER TABLE "batch" ADD CONSTRAINT "batch_trackId_track_id_fk" FOREIGN KEY ("trackId") ' +
        'REFERENCES "track"("id") ON DELETE no action ON UPDATE no action;',
    )
  })

  it('strips every occurrence in a multi-statement file', () => {
    const input = [
      `CREATE TYPE "public"."batchStatus" AS ENUM('upcoming');`,
      `CREATE TYPE "public"."chapterStatus" AS ENUM('draft');`,
      `ALTER TABLE "batch" ADD CONSTRAINT "x" FOREIGN KEY ("trackId") REFERENCES "public"."track"("id");`,
    ].join('\n')

    const result = stripPublicSchemaQualifier(input)

    expect(result).not.toContain('"public".')
    expect(result).toContain('CREATE TYPE "batchStatus"')
    expect(result).toContain('CREATE TYPE "chapterStatus"')
    expect(result).toContain('REFERENCES "track"("id")')
  })

  it('leaves an already-unqualified statement untouched (idempotent)', () => {
    const input = 'ALTER TABLE "batch" ADD CONSTRAINT "x" FOREIGN KEY ("trackId") REFERENCES "track"("id");'
    expect(stripPublicSchemaQualifier(input)).toBe(input)
  })

  it('does not touch an unrelated occurrence of the word "public"', () => {
    const input = `-- this migration is public information\nCREATE TABLE "track" ("id" uuid);`
    expect(stripPublicSchemaQualifier(input)).toBe(input)
  })
})
