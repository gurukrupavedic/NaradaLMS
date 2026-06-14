import '@narada/env/load'
import { argv } from 'node:process'

import { inArray } from 'drizzle-orm'

import {
  dropSchoolSchema,
  listSchoolSchemaOrganizationIds,
  organization,
  publicDb,
  shutdownPools,
} from '@narada/db'

const dryRun = !argv.includes('--delete')

try {
  const [schools, schemaOrganizationIds] = await Promise.all([
    publicDb
      .select({ id: organization.id, slug: organization.slug, name: organization.name })
      .from(organization),
    listSchoolSchemaOrganizationIds(),
  ])
  const schoolIds = new Set(schools.map(school => school.id))
  const schemaIds = new Set(schemaOrganizationIds)
  const orphanSchemas = schemaOrganizationIds.filter(id => !schoolIds.has(id))
  const orphanRows = schools.filter(school => !schemaIds.has(school.id))

  if (!dryRun) {
    await Promise.all(orphanSchemas.map(id => dropSchoolSchema(id)))
    if (orphanRows.length > 0) {
      await publicDb.delete(organization).where(
        inArray(
          organization.id,
          orphanRows.map(school => school.id),
        ),
      )
    }
  }

  console.log(
    JSON.stringify(
      {
        dryRun,
        orphanSchemas,
        orphanRows,
        deleted: dryRun
          ? { schemas: [], rows: [] }
          : { schemas: orphanSchemas, rows: orphanRows.map(school => school.id) },
      },
      null,
      2,
    ),
  )
} finally {
  await shutdownPools()
}
