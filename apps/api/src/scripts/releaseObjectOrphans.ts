import { argv, env, exit } from 'node:process'

import { eq } from 'drizzle-orm'

import { getScopedDatabase, organization, publicDb, shutdownPools } from '@narada/db'
import { objectLifecycle } from '../services/objectLifecycle'

const schoolSlug = env.SCHOOL_SLUG
const dryRun = !argv.includes('--delete')

if (!schoolSlug) {
  console.error('Set SCHOOL_SLUG to the school slug to scan.')
  exit(1)
}

try {
  const school = await publicDb.query.organization.findFirst({
    where: eq(organization.slug, schoolSlug),
  })

  if (!school) {
    console.error(`No school found for slug: ${schoolSlug}`)
    process.exitCode = 1
  } else {
    const db = getScopedDatabase(school.id)
    const result = await objectLifecycle.releaseOrphans(db, school.id, { dryRun })

    console.log(JSON.stringify({ ...result, dryRun }, null, 2))
  }
} finally {
  await shutdownPools()
}
