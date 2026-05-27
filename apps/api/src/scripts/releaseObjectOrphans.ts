import { argv, env, exit } from 'node:process'

import { eq } from 'drizzle-orm'

import { getScopedDatabase, organization, publicDb } from '@narada/db'
import { objectLifecycle } from '../utils/objectLifecycle'

const schoolSlug = env.SCHOOL_SLUG
const dryRun = !argv.includes('--delete')

if (!schoolSlug) {
  console.error('Set SCHOOL_SLUG to the school slug to scan.')
  exit(1)
}

const school = await publicDb.query.organization.findFirst({
  where: eq(organization.slug, schoolSlug),
})

if (!school) {
  console.error(`No school found for slug: ${schoolSlug}`)
  exit(1)
}

const db = getScopedDatabase(school.slug)
const result = await objectLifecycle.releaseOrphans(db, school.id, { dryRun })

console.log(JSON.stringify({ ...result, dryRun }, null, 2))
