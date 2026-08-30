import type { SchoolDbClient } from '@narada/db'

import { notFound } from '../error'
import type { ContentReadView } from '../utils/accessPolicy'
import * as repository from './repository'
import type { TrackWithChapters } from './schema'

type TrackServiceContext = { db: SchoolDbClient }

export async function findAll(
  context: TrackServiceContext,
  view: ContentReadView,
): Promise<TrackWithChapters[]> {
  return repository.findAll(context.db, view)
}

export async function findById(
  context: TrackServiceContext,
  id: string,
  view: ContentReadView,
): Promise<TrackWithChapters> {
  const row = await repository.findById(context.db, id, view)
  if (!row) {
    throw notFound()
  }

  return row
}
