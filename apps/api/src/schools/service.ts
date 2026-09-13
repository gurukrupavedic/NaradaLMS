import type { PublicDb } from '@narada/db'

import { conflict, notFound } from '../error'
import * as repository from './repository'
import type { School, UpdateSchoolData } from './schema'

type SchoolServiceContext = { db: PublicDb }

export async function findAllSchools(context: SchoolServiceContext): Promise<School[]> {
  return repository.findAll(context.db)
}

/**
 * A friendly precheck for the common case (409 with an obvious cause) plus the plain update —
 * a concurrent slug claim that slips past the precheck still hits `organization`'s own unique
 * index and gets translated to the same 409 by the global `translateDbError` fallback, so no
 * second race window is left open.
 */
export async function updateSchool(
  context: SchoolServiceContext,
  id: string,
  data: UpdateSchoolData,
): Promise<School> {
  const existing = await repository.findById(context.db, id)
  if (!existing) {
    throw notFound()
  }

  if (data.slug && data.slug !== existing.slug) {
    const taken = await repository.findBySlug(context.db, data.slug)
    if (taken) {
      throw conflict('a school with this slug already exists')
    }
  }

  const row = await repository.update(context.db, id, data)
  if (!row) {
    throw notFound()
  }

  return row
}
