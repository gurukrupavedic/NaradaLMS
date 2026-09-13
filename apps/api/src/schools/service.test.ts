import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { PublicDb } from '@narada/db'

import { findAllSchools, updateSchool } from './service'
import * as repository from './repository'

// Explicit factory (rather than vitest's auto-mock) so the real `./repository` module — which
// pulls in `@narada/db` at import time and would trigger real env-var validation — never loads.
vi.mock('./repository', () => ({
  findAll: vi.fn(),
  findById: vi.fn(),
  findBySlug: vi.fn(),
  update: vi.fn(),
}))

const db = {} as PublicDb
const context = { db }

const existingSchool = {
  id: 'school-1',
  name: 'Gurukrupa Vedic',
  slug: 'gurukrupa-vedic',
  createdAt: new Date('2024-01-01T00:00:00Z'),
}

beforeEach(() => {
  vi.resetAllMocks()
})

describe('findAllSchools', () => {
  it('passes every school straight through from the repository', async () => {
    vi.mocked(repository.findAll).mockResolvedValue([existingSchool])

    await expect(findAllSchools(context)).resolves.toEqual([existingSchool])
  })

  it('returns an empty array, not an error, when there are no schools', async () => {
    vi.mocked(repository.findAll).mockResolvedValue([])

    await expect(findAllSchools(context)).resolves.toEqual([])
  })
})

describe('updateSchool', () => {
  it('throws 404 for a nonexistent school, without ever calling update', async () => {
    vi.mocked(repository.findById).mockResolvedValue(undefined)

    await expect(updateSchool(context, 'missing', { name: 'New Name' })).rejects.toMatchObject({
      statusCode: 404,
    })
    expect(repository.update).not.toHaveBeenCalled()
  })

  it('updates the name without checking slug uniqueness when slug is not supplied', async () => {
    vi.mocked(repository.findById).mockResolvedValue(existingSchool)
    vi.mocked(repository.update).mockResolvedValue({ ...existingSchool, name: 'New Name' })

    const result = await updateSchool(context, 'school-1', { name: 'New Name' })

    expect(result.name).toBe('New Name')
    expect(repository.findBySlug).not.toHaveBeenCalled()
  })

  it('allows re-submitting the same slug the school already has, without a conflict check', async () => {
    vi.mocked(repository.findById).mockResolvedValue(existingSchool)
    vi.mocked(repository.update).mockResolvedValue(existingSchool)

    await updateSchool(context, 'school-1', { slug: existingSchool.slug })

    expect(repository.findBySlug).not.toHaveBeenCalled()
  })

  it('throws 409 when the new slug is already taken by another school', async () => {
    vi.mocked(repository.findById).mockResolvedValue(existingSchool)
    vi.mocked(repository.findBySlug).mockResolvedValue({
      id: 'school-2',
      name: 'Someone Else',
      slug: 'taken-slug',
      createdAt: new Date(),
    })

    await expect(updateSchool(context, 'school-1', { slug: 'taken-slug' })).rejects.toMatchObject({
      statusCode: 409,
    })
    expect(repository.update).not.toHaveBeenCalled()
  })

  it('updates the slug when it is free', async () => {
    vi.mocked(repository.findById).mockResolvedValue(existingSchool)
    vi.mocked(repository.findBySlug).mockResolvedValue(undefined)
    vi.mocked(repository.update).mockResolvedValue({ ...existingSchool, slug: 'new-slug' })

    const result = await updateSchool(context, 'school-1', { slug: 'new-slug' })

    expect(result.slug).toBe('new-slug')
  })

  it('throws 404 if the row disappears between the precheck and the update (lost race)', async () => {
    vi.mocked(repository.findById).mockResolvedValue(existingSchool)
    vi.mocked(repository.update).mockResolvedValue(undefined)

    await expect(updateSchool(context, 'school-1', { name: 'New Name' })).rejects.toMatchObject({
      statusCode: 404,
    })
  })
})
