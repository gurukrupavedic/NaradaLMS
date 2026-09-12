import { type SchoolDbClient } from '@narada/db'

import { conflict, internalError, notFound } from '../error'
import * as repository from './repository'
import type { CreateRegistrationData, FindRegistrationsData, Registration } from './schema'

type RegistrationServiceContext = { db: SchoolDbClient }

export async function findAll(
  context: RegistrationServiceContext,
  params: FindRegistrationsData,
): Promise<{ items: Registration[]; nextCursor: string | null }> {
  return repository.findAll(context.db, params)
}

export async function findById(context: RegistrationServiceContext, id: string): Promise<Registration> {
  const row = await repository.findById(context.db, id)
  if (!row) {
    throw notFound()
  }

  return row
}

export async function submit(
  context: RegistrationServiceContext,
  data: CreateRegistrationData,
): Promise<Registration> {
  const row = await repository.insert(context.db, data)
  if (!row) {
    throw internalError()
  }

  return row
}

async function review(
  context: RegistrationServiceContext,
  id: string,
  status: 'approved' | 'rejected',
  reviewedBy: string | null,
): Promise<Registration> {
  const existing = await repository.findById(context.db, id)
  if (!existing) {
    throw notFound()
  }

  const row = await repository.transitionStatus(context.db, id, status, reviewedBy)
  if (!row) {
    // The precheck above ruled out "no such registration" — the only other way transitionStatus
    // updates 0 rows is a registration that's already been reviewed (its `pending` guard failed).
    throw conflict('registration has already been reviewed')
  }

  return row
}

export async function approve(
  context: RegistrationServiceContext,
  id: string,
  reviewedBy: string | null,
): Promise<Registration> {
  return review(context, id, 'approved', reviewedBy)
}

export async function reject(
  context: RegistrationServiceContext,
  id: string,
  reviewedBy: string | null,
): Promise<Registration> {
  return review(context, id, 'rejected', reviewedBy)
}
