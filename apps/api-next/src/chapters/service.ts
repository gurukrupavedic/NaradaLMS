import type { SchoolDbClient } from '@narada/db'

import { notFound } from '../error'
import type { ContentReadView } from '../utils/accessPolicy'
import * as repository from './repository'
import type { Chapter } from './schema'

type ChapterServiceContext = { db: SchoolDbClient }

/** A draft chapter under `learnerPreview` view 404s exactly like a nonexistent one — never 403 — so guessing an ID can't disclose hidden content. */
export async function findById(
  context: ChapterServiceContext,
  id: string,
  view: ContentReadView,
): Promise<Chapter> {
  const row = await repository.findById(context.db, id, view)
  if (!row) {
    throw notFound()
  }

  return row
}
