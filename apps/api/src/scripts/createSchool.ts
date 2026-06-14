import '@narada/env/load'
import { env, exit } from 'node:process'

import { shutdownPools } from '@narada/db'
import { createSchool, createSchoolSchema } from '../services/school'

const parsed = createSchoolSchema.safeParse({
  name: env.SCHOOL_NAME,
  slug: env.SCHOOL_SLUG,
  ownerUserId: env.OWNER_USER_ID,
})

if (!parsed.success) {
  console.error('Set SCHOOL_NAME and SCHOOL_SLUG to create a school. Optionally set OWNER_USER_ID to add an owner.')
  console.error(JSON.stringify(parsed.error.issues, null, 2))
  exit(1)
}

try {
  const school = await createSchool(parsed.data)
  console.log(JSON.stringify(school, null, 2))
} finally {
  await shutdownPools()
}
