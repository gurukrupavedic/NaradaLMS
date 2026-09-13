/**
 * Pure schema-name guard, deliberately with zero imports from `@narada/db` (which eagerly
 * validates `@narada/env` at module load — see `testDatabaseUrl.ts`'s doc comment for the same
 * concern). Keeping this import-free lets `cleanup.test.ts` unit-test the validation logic
 * without any database or env setup, in the plain (non-integration) vitest project.
 *
 * Mirrors `organizationIdFromSchoolSchema`'s prefix check in `packages/db/src/provision.ts`
 * (`schemaName.startsWith('school-')`) plus an explicit `'public'` refusal — a schema name is
 * only safe to drop if it's really a `school-*` schema.
 */
export function isValidTestSchemaName(schemaName: string): boolean {
  if (schemaName === 'public') {
    return false
  }

  return schemaName.startsWith('school-')
}
