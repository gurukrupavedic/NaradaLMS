import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const schoolMigrationsDir = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  '../../drizzle/school',
)

/**
 * drizzle-kit@0.31.10 qualifies cross-table references with `"public".` (e.g.
 * `REFERENCES "public"."batch"("id")`, `CREATE TYPE "public"."batchStatus"`) when generating DDL
 * for plain (non-`pgSchema`-wrapped) `pgTable`s — which is what every school-schema table is.
 * That's wrong here: a school's tables live only in its own `school-<id>` schema (selected via
 * `search_path`), never literally in `public` — every `.references()` in `schema/school.ts`
 * points at another school-schema table, none at a public-schema one, so a qualifier this exact
 * would only ever be spurious, never legitimate. Verified against drizzle-kit@0.31.10's actual
 * output (both fresh and incremental generation) — the ONLY place it emits `"public".` is this
 * qualifier; column type references (e.g. `"status" "batchStatus"`) are already unqualified. A
 * blanket removal of the literal string `"public".` is therefore safe and precise.
 */
export function stripPublicSchemaQualifier(sql: string): string {
  return sql.replaceAll('"public".', '')
}

/**
 * Rewrites every school-schema migration `.sql` file in place, stripping the spurious `"public".`
 * qualifier. Idempotent — a file that's already clean (every migration applied before this bug
 * was found, or one already fixed by hand or by a previous run) is left byte-for-byte unchanged.
 * Deliberately scoped to `drizzle/school/*.sql` only: `drizzle/public/`'s own migrations
 * genuinely belong to the literal `public` schema, so `"public".` there is correct and must not
 * be touched.
 */
export function fixSchoolMigrationFiles(): string[] {
  const changed: string[] = []

  for (const entry of fs.readdirSync(schoolMigrationsDir, { withFileTypes: true })) {
    if (!entry.isFile() || !entry.name.endsWith('.sql')) continue

    const filePath = path.join(schoolMigrationsDir, entry.name)
    const original = fs.readFileSync(filePath, 'utf8')
    const fixed = stripPublicSchemaQualifier(original)

    if (fixed !== original) {
      fs.writeFileSync(filePath, fixed)
      changed.push(entry.name)
    }
  }

  return changed
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const changed = fixSchoolMigrationFiles()
  if (changed.length === 0) {
    console.log('fixSchoolMigrationQualifiers: no "public". qualifiers found, nothing to fix')
  } else {
    console.log(`fixSchoolMigrationQualifiers: stripped "public". qualifiers from: ${changed.join(', ')}`)
  }
}
