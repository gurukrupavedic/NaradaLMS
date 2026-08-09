import '@narada/env/load'
import { defineCommand, runMain } from 'citty'
import { eq } from 'drizzle-orm'

import {
  dropSchoolSchema,
  member,
  organization,
  provisionSchool,
  publicDb,
  shutdownPools,
  uuidv7,
} from '@narada/db'
import { promptSuperAdminPhone, requireSuperAdminByPhone } from './provisioning'

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
    const operatorPhone = await promptSuperAdminPhone()
    await createSchool({
      name: args.name,
      slug: args.slug,
      operatorPhone,
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
  operatorPhone: string
  ownerEmail?: string
}) {
  assertSlug(input.slug)

  try {
    const operator = await requireSuperAdminByPhone(input.operatorPhone)
    // Owner lookup deliberately stays email-based: it targets an arbitrary existing user (who may
    // not have a phoneNumber set yet), unlike the operator check above, which only ever needs to
    // find the person running this script.
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
