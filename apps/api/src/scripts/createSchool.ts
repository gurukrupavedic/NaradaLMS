import { env, exit } from 'node:process'

import { shutdownPools } from '@narada/db'
import { createSchool, createSchoolSchema } from '../services/school'

const parsed = createSchoolSchema.safeParse({
  name: env.SCHOOL_NAME,
  slug: env.SCHOOL_SLUG,
})

if (!parsed.success) {
  console.error('Set SCHOOL_NAME and SCHOOL_SLUG to create a school.')
  console.error(JSON.stringify(parsed.error.issues, null, 2))
  exit(1)
}

try {
  const school = await createSchool(parsed.data)
  console.log(JSON.stringify(school, null, 2))
} finally {
  await shutdownPools()
}
