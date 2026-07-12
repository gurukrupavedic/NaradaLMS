import { Router } from 'express'
import { z } from 'zod'

import { schoolRoute } from '../naradaRoute'
import { parseParams } from '../utils/validate'
import { notFound } from '../error'
import { authorizeContentReadView } from '../utils/chapterView'
import { findChapterById } from '../services/chapterReader'

const router = Router()

router.get(
  '/:chapterId',
  schoolRoute(async ({ req, res, ctx }) => {
    const { chapterId } = parseParams(z.object({ chapterId: z.uuid() }), req)

    const view = await authorizeContentReadView(req)
    const chapter = await findChapterById(ctx.db, chapterId, view)
    if (!chapter) {
      throw notFound()
    }

    res.status(200).json({ ok: true, data: chapter })
  }),
)

export default router
