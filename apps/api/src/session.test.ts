import { describe, expect, it, vi } from 'vitest'

// `session.ts` imports `@narada/auth` at module scope (for `SessionService`), which would
// trigger real env-var validation on import — stubbed for the same reason other unit tests in
// this workspace mock `@narada/db`/`@narada/auth` rather than importing them for real.
vi.mock('@narada/auth', () => ({ auth: {} }))
vi.mock('better-auth/node', () => ({ fromNodeHeaders: vi.fn() }))

import { requireSuperAdmin, type User } from './session'

function userWith(isSuperAdmin: boolean): User {
  return { id: 'user-1', name: 'Name', email: 'name@example.com', isSuperAdmin } as User
}

describe('requireSuperAdmin', () => {
  it('does not throw for a super admin', () => {
    expect(() => requireSuperAdmin(userWith(true))).not.toThrow()
  })

  it('throws a 403 for a non-super-admin', () => {
    expect(() => requireSuperAdmin(userWith(false))).toThrowError(
      expect.objectContaining({ statusCode: 403 }),
    )
  })
})
