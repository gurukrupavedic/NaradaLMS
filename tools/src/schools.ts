import '@narada/env/load'
import { defineCommand, runMain } from 'citty'
import { eq } from 'drizzle-orm'

import {
  dropSchoolSchema,
  member,
  migrateExistingSchool,
  needsLegacyMigrationBackfill,
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

const migrate = defineCommand({
  meta: {
    description:
      'Apply any pending school-schema migrations to already-provisioned school(s) (the ' +
      'counterpart to `create`, which only ever migrates a school once, at creation).',
  },
  args: {
    slug: {
      type: 'string',
      description: 'Only migrate the school with this slug (default: every existing school).',
    },
    dryRun: {
      type: 'boolean',
      default: false,
      description: 'Report what would happen without changing anything.',
    },
  },
  async run({ args }) {
    const operatorPhone = await promptSuperAdminPhone()
    await requireSuperAdminByPhone(operatorPhone)
    await migrateSchools({ slug: args.slug, dryRun: args.dryRun })
  },
})

runMain(
  defineCommand({
    meta: { name: 'schools', description: 'Manage rare school provisioning operations.' },
    subCommands: { create, migrate },
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

async function migrateSchools(input: { slug?: string; dryRun: boolean }) {
  try {
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
  } finally {
    await shutdownPools()
  }
}

async function requireSchoolBySlug(slug: string) {
  const school = await publicDb.query.organization.findFirst({ where: (t, { eq }) => eq(t.slug, slug) })
  if (!school) {
    throw new Error(`No school with slug \`${slug}\``)
  }

  return school
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
