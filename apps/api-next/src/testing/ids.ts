/**
 * Id generators for fixtures. BetterAuth's public-schema tables (`user`, `session`, `member`,
 * `organization` — see `packages/db/src/schema/auth.ts`) declare `text('id').primaryKey()` with
 * no default, so callers must generate and pass an id explicitly. School-schema tables (see
 * `packages/db/src/schema/school.ts`) use `uuid('id').primaryKey().$defaultFn(uuidv7)`, so they
 * don't need one unless a test wants a fixed/known id up front.
 */

export function newOrgId(): string {
  return crypto.randomUUID()
}

export function newUserId(): string {
  return crypto.randomUUID()
}

export function newMemberId(): string {
  return crypto.randomUUID()
}

export function newSessionId(): string {
  return crypto.randomUUID()
}

export function newInvitationId(): string {
  return crypto.randomUUID()
}
