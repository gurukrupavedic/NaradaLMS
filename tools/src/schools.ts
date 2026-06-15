import '@narada/env/load'
import { defineCommand, runMain } from 'citty'
import Enquirer from 'enquirer'
import { eq } from 'drizzle-orm'

import { auth } from '@narada/auth'
import {
  dropSchoolSchema,
  member,
  organization,
  provisionSchool,
  publicDb,
  shutdownPools,
  uuidv7,
} from '@narada/db'

const create = defineCommand({
  meta: { description: 'Create a school organization and provision its Postgres schema.' },
  args: {
    name: {
      type: 'string',
      required: true,
      description: 'School display name.',
    },
    slug: {
      type: 'string',
      required: true,
      description: 'Lowercase URL slug for the school.',
    },
    ownerEmail: {
      type: 'string',
      description: 'Optional email of a different user to add as the school owner.',
    },
  },
  async run({ args }) {
    const credentials = await promptCredentials()
    await createSchool({
      name: args.name,
      slug: args.slug,
      operatorEmail: credentials.email,
      operatorPassword: credentials.password,
      ownerEmail: args.ownerEmail,
    })
  },
})

runMain(
  defineCommand({
    meta: { name: 'schools', description: 'Manage rare school provisioning operations.' },
    subCommands: { create },
  }),
)

async function createSchool(input: {
  name: string
  slug: string
  operatorEmail: string
  operatorPassword: string
  ownerEmail?: string
}) {
  assertSlug(input.slug)

  try {
    const operator = await authenticateSuperAdmin(input.operatorEmail, input.operatorPassword)
    const ownerEmail = input.ownerEmail ?? operator.email
    const ownerUserId = await findUserIdByEmail(ownerEmail)
    const existing = await publicDb.query.organization.findFirst({
      where: (t, { eq }) => eq(t.slug, input.slug),
    })

    if (existing) {
      throw new Error(`School slug already exists: ${input.slug}`)
    }

    const organizationId = uuidv7()
    const createdAt = new Date()
    await publicDb
      .insert(organization)
      .values({ id: organizationId, name: input.name, slug: input.slug, createdAt })

    try {
      await provisionSchool(organizationId)
      if (ownerUserId) {
        await publicDb.insert(member).values({
          id: uuidv7(),
          organizationId,
          userId: ownerUserId,
          role: 'owner',
          createdAt: new Date(),
        })
      }
    } catch (error) {
      await rollbackSchoolCreate(organizationId, error)
      throw error
    }

    console.log(
      JSON.stringify(
        {
          id: organizationId,
          name: input.name,
          slug: input.slug,
          createdAt,
          ownerEmail,
        },
        null,
        2,
      ),
    )
  } finally {
    await shutdownPools()
  }
}

async function authenticateSuperAdmin(email: string, password: string) {
  const session = await auth.api.signInEmail({
    body: { email, password },
  })

  if (!session.user.isSuperAdmin) {
    throw new Error('Authenticated user must be a super-admin.')
  }

  return session.user
}

async function findUserIdByEmail(email: string) {
  const row = await publicDb.query.user.findFirst({
    where: (t, { eq }) => eq(t.email, email),
    columns: { id: true },
  })

  if (!row) {
    throw new Error(`User with email \`${email}\` not found`)
  }

  return row.id
}

async function promptCredentials(): Promise<{ email: string; password: string }> {
  return Enquirer.prompt<{ email: string; password: string }>([
    {
      type: 'input',
      name: 'email',
      message: 'Super-admin email',
      required: true,
      result: value => value.trim(),
    },
    {
      type: 'password',
      name: 'password',
      message: 'Super-admin password',
      required: true,
    },
  ])
}

function assertSlug(slug: string) {
  if (!/^[a-z0-9-]+$/.test(slug)) {
    throw new Error('School slug must be lowercase alphanumeric with hyphens.')
  }
}

async function rollbackSchoolCreate(schoolId: string, cause: unknown) {
  const results = await Promise.allSettled([
    publicDb.delete(organization).where(eq(organization.id, schoolId)),
    dropSchoolSchema(schoolId),
  ])

  const failures = results.filter(result => result.status === 'rejected')
  if (failures.length > 0) {
    throw new AggregateError(
      [cause, ...failures.map(result => result.reason)],
      `failed to provision school ${schoolId}; rollback also failed`,
    )
  }
}
