import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { PublicDb } from '@narada/db'

import { getAuthProfile } from './service'
import * as repository from './repository'

// Explicit factory (rather than vitest's auto-mock) so the real `./repository` module — which
// pulls in `@narada/db` at import time and would trigger real env-var validation — never loads.
vi.mock('./repository', () => ({
  findMembershipsForUser: vi.fn(),
}))

describe('getAuthProfile', () => {
  const db = {} as PublicDb

  beforeEach(() => {
    vi.resetAllMocks()
  })

  it('projects each membership to organization id/name/slug and role', async () => {
    vi.mocked(repository.findMembershipsForUser).mockResolvedValue([
      {
        organizationId: 'org-1',
        role: 'owner',
        organization: { id: 'org-1', name: 'Gurukrupa', slug: 'gurukrupa' },
      },
    ] as never)

    await expect(getAuthProfile(db, 'user-1', false)).resolves.toEqual({
      isSuperAdmin: false,
      memberships: [
        {
          organizationId: 'org-1',
          organizationName: 'Gurukrupa',
          organizationSlug: 'gurukrupa',
          role: 'owner',
        },
      ],
    })
  })

  it('returns zero memberships as an empty array, not an error', async () => {
    vi.mocked(repository.findMembershipsForUser).mockResolvedValue([])

    await expect(getAuthProfile(db, 'user-1', false)).resolves.toEqual({
      isSuperAdmin: false,
      memberships: [],
    })
  })

  it('passes isSuperAdmin through unchanged regardless of memberships', async () => {
    vi.mocked(repository.findMembershipsForUser).mockResolvedValue([])

    await expect(getAuthProfile(db, 'user-1', true)).resolves.toMatchObject({
      isSuperAdmin: true,
    })
  })
})
