import { pgTable, text, boolean, integer, timestamp, uuid, index, uniqueIndex, pgEnum } from 'drizzle-orm/pg-core'
import { uuidv7 } from '../ids'

export const user = pgTable('user', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  emailVerified: boolean('emailVerified').default(false).notNull(),
  phoneNumber: text('phoneNumber').unique(),
  phoneNumberVerified: boolean('phoneNumberVerified'),
  image: text('image'),
  isSuperAdmin: boolean('isSuperAdmin').default(false).notNull(),
  createdAt: timestamp('createdAt').defaultNow().notNull(),
  updatedAt: timestamp('updatedAt')
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
})

export const session = pgTable(
  'session',
  {
    id: text('id').primaryKey(),
    expiresAt: timestamp('expiresAt').notNull(),
    token: text('token').notNull().unique(),
    createdAt: timestamp('createdAt').defaultNow().notNull(),
    updatedAt: timestamp('updatedAt')
      .$onUpdate(() => new Date())
      .notNull(),
    ipAddress: text('ipAddress'),
    userAgent: text('userAgent'),
    userId: text('userId')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    activeOrganizationId: text('activeOrganizationId'),
  },
  table => [index('session_userId_idx').on(table.userId)],
)

export const deviceLinkStatus = pgEnum('deviceLinkStatus', [
  'pending',
  'approved',
  'claimed',
  'expired',
])

// A device-link code lets an already-signed-in device (Settings' "approve a device" form) extend
// a real session to a brand-new one, with no OTP — the standard direction for this pattern (code
// shown on the new device, approved from a trusted one), not the reverse. `userId` starts null:
// the new device that calls `start` has no identity yet, and only gets one once a signed-in
// session approves it. Lives alongside `session`/`verification` in the public schema, not per-
// school — this is an account-level concern, resolved before any school/profile is chosen.
export const deviceLinkCode = pgTable(
  'deviceLinkCode',
  {
    id: uuid('id').primaryKey().$defaultFn(uuidv7),
    userId: text('userId').references(() => user.id, { onDelete: 'cascade' }),
    code: text('code').notNull().unique(),
    status: deviceLinkStatus('status').notNull().default('pending'),
    // Failed `approve` attempts against this code specifically — belt-and-suspenders alongside
    // the endpoint's own per-IP rate limit, not the primary defense: at 9 alphanumeric characters
    // the code itself is already far past brute-forceable.
    attempts: integer('attempts').notNull().default(0),
    // The requesting device's own User-Agent, captured at `start` — shown back on the trusted
    // device's confirmation screen ("approve sign-in for Safari on iPhone?") before it commits,
    // rather than the trusted device approving a code with no idea what it's actually granting.
    requestUserAgent: text('requestUserAgent'),
    expiresAt: timestamp('expiresAt').notNull(),
    approvedAt: timestamp('approvedAt'),
    claimedAt: timestamp('claimedAt'),
    claimedSessionId: text('claimedSessionId').references(() => session.id, { onDelete: 'set null' }),
    createdAt: timestamp('createdAt').defaultNow().notNull(),
  },
  table => [
    index('deviceLinkCode_status_expiresAt_idx').on(table.status, table.expiresAt),
    index('deviceLinkCode_userId_idx').on(table.userId),
  ],
)

export const account = pgTable(
  'account',
  {
    id: text('id').primaryKey(),
    accountId: text('accountId').notNull(),
    providerId: text('providerId').notNull(),
    userId: text('userId')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    accessToken: text('accessToken'),
    refreshToken: text('refreshToken'),
    idToken: text('idToken'),
    accessTokenExpiresAt: timestamp('accessTokenExpiresAt'),
    refreshTokenExpiresAt: timestamp('refreshTokenExpiresAt'),
    scope: text('scope'),
    password: text('password'),
    createdAt: timestamp('createdAt').defaultNow().notNull(),
    updatedAt: timestamp('updatedAt')
      .$onUpdate(() => new Date())
      .notNull(),
  },
  table => [index('account_userId_idx').on(table.userId)],
)

export const verification = pgTable(
  'verification',
  {
    id: text('id').primaryKey(),
    identifier: text('identifier').notNull(),
    value: text('value').notNull(),
    expiresAt: timestamp('expiresAt').notNull(),
    createdAt: timestamp('createdAt').defaultNow().notNull(),
    updatedAt: timestamp('updatedAt')
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  table => [index('verification_identifier_idx').on(table.identifier)],
)

export const organization = pgTable(
  'organization',
  {
    id: text('id').primaryKey(),
    name: text('name').notNull(),
    slug: text('slug').notNull().unique(),
    logo: text('logo'),
    createdAt: timestamp('createdAt').notNull(),
    metadata: text('metadata'),
  },
  table => [uniqueIndex('organization_slug_uidx').on(table.slug)],
)

export const member = pgTable(
  'member',
  {
    id: text('id').primaryKey(),
    organizationId: text('organizationId')
      .notNull()
      .references(() => organization.id, { onDelete: 'cascade' }),
    userId: text('userId')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    role: text('role').default('member').notNull(),
    createdAt: timestamp('createdAt').notNull(),
  },
  table => [
    // Enforces one membership per (organization, user); every current lookup filters by both
    // columns together, and this composite index's leading column also covers organizationId-only
    // lookups (e.g. BetterAuth listing an org's members), so the old standalone
    // member_organizationId_idx is redundant and has been dropped.
    uniqueIndex('member_organizationId_userId_uidx').on(table.organizationId, table.userId),
    index('member_userId_idx').on(table.userId),
  ],
)

export const invitation = pgTable(
  'invitation',
  {
    id: text('id').primaryKey(),
    organizationId: text('organizationId')
      .notNull()
      .references(() => organization.id, { onDelete: 'cascade' }),
    email: text('email').notNull(),
    role: text('role'),
    status: text('status').default('pending').notNull(),
    expiresAt: timestamp('expiresAt').notNull(),
    createdAt: timestamp('createdAt').defaultNow().notNull(),
    inviterId: text('inviterId')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
  },
  table => [
    index('invitation_organizationId_idx').on(table.organizationId),
    index('invitation_email_idx').on(table.email),
  ],
)

