import { migrateExistingSchool, needsLegacyMigrationBackfill, publicDb } from '@narada/db'

/**
 * The actual migration work behind `schools migrate` (`schools.ts`), pulled out into its own
 * module rather than left inline there: `schools.ts` unconditionally calls `runMain()` as an
 * import-time side effect (it's a citty CLI entrypoint), so importing anything from it — even just
 * this function — would try to parse `process.argv` and run the CLI a second time. `ci-migrate.ts`
 * needs this same logic without that side effect and without the CLI's interactive
 * super-admin-phone gate (see its own doc comment for why).
 */
export async function migrateSchools(input: { slug?: string; dryRun: boolean }): Promise<void> {
  const schools = input.slug
    ? [await requireSchoolBySlug(input.slug)]
    : await publicDb.query.organization.findMany()

  for (const school of schools) {
    if (input.dryRun) {
      const wouldBackfillLegacyTracking = await needsLegacyMigrationBackfill(school.id)
      console.log(
        JSON.stringify({
          id: school.id,
          slug: school.slug,
          dryRun: true,
          wouldBackfillLegacyTracking,
        }),
      )
      continue
    }

    const { backfilledLegacyTracking } = await migrateExistingSchool(school.id)
    console.log(
      JSON.stringify({
        id: school.id,
        slug: school.slug,
        migrated: true,
        backfilledLegacyTracking,
      }),
    )
  }
}

async function requireSchoolBySlug(slug: string) {
  const school = await publicDb.query.organization.findFirst({ where: (t, { eq }) => eq(t.slug, slug) })
  if (!school) {
    throw new Error(`No school with slug \`${slug}\``)
  }

  return school
}
