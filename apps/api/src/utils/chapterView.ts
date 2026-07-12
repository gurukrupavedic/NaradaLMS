import type { Request } from 'express'

import type { ChapterReadView } from '../services/chapterReader'
import { authorize, hasPermission } from './auth'

export async function authorizeContentReadView(req: Request): Promise<ChapterReadView> {
  await authorize(req, { scope: 'school', permissions: { content: ['read'] } })
  const canAuthor = await hasPermission(req, {
    scope: 'school',
    permissions: { content: ['update'] },
  })

  return canAuthor ? { kind: 'authoring' } : { kind: 'learnerPreview' }
}
