import { Router } from 'express'
import { z } from 'zod'

import { schoolRoute } from '../naradaRoute'
import { parseBody, parseParams } from '../utils/validate'
import { notFound } from '../error'
import { authorize } from '../utils/auth'
import { authoringView, authorizeContentReadView } from '../utils/chapterView'
import { findChapterById, findSegmentsByChapter } from '../services/chapterReader'
import { putSegmentsSchema, replaceSegments } from '../services/segment'

// mergeParams: parent path provides :chapterId.
const router = Router({ mergeParams: true })

router.get(
  '/',
  schoolRoute(async ({ req, res, ctx }) => {
    const { chapterId } = parseParams(z.object({ chapterId: z.uuid() }), req)

    const view = await authorizeContentReadView(req)
    const segments = await findSegmentsByChapter(ctx.db, chapterId, view)
    if (!segments) {
      throw notFound()
    }
    res.status(200).json({ ok: true, data: segments })
  }),
)

router.put(
  '/',
  schoolRoute(async ({ req, res, ctx }) => {
    const { chapterId } = parseParams(z.object({ chapterId: z.uuid() }), req)
    const inputs = parseBody(putSegmentsSchema, req)

    await authorize(req, { scope: 'school', permissions: { content: ['update'] } })
    const chapter = await findChapterById(ctx.db, chapterId, authoringView)
    if (!chapter) {
      throw notFound()
    }

    const segments = await replaceSegments(ctx.db, chapterId, inputs)
    res.status(200).json({ ok: true, data: segments })
  }),
)

export default router
