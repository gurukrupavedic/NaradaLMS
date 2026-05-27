import type { Request } from 'express'

import type { SchoolDatabase } from '@narada/db'
import type { ChapterReadView } from '../services/chapterReader'
import { authorize, hasPermission } from './auth'

export async function authorizeContentReadView(
  req: Request,
  db: SchoolDatabase,
): Promise<ChapterReadView> {
  await authorize(req, db, { scope: 'school', permissions: { content: ['read'] } })
  const canAuthor = await hasPermission(req, db, {
    scope: 'school',
    permissions: { content: ['update'] },
  })

  return canAuthor ? { kind: 'authoring' } : { kind: 'learnerPreview' }
}

export const authoringView = { kind: 'authoring' } satisfies ChapterReadView
