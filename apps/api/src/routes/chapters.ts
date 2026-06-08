import { Router } from 'express'
import { z } from 'zod'

import { schoolRoute } from '../naradaRoute'
import { parseBody, parseParams } from '../utils/validate'
import { notFound } from '../error'
import { authorize } from '../utils/auth'
import { authoringView, authorizeContentReadView } from '../utils/chapterView'
import { findChapterById } from '../services/chapterReader'
import {
  applyChapterScript,
  createChapter,
  createChapterSchema,
  updateChapter,
  updateChapterSchema,
} from '../services/chapter'
import { objectLifecycle } from '../services/objectLifecycle'

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

router.post(
  '/',
  schoolRoute(async ({ req, res, ctx }) => {
    const data = parseBody(createChapterSchema, req)

    await authorize(req, { scope: 'school', permissions: { content: ['create'] } })
    const created = await createChapter(ctx.db, data)
    res.status(201).json({ ok: true, data: created })
  }),
)

router.patch(
  '/:chapterId',
  schoolRoute(async ({ req, res, ctx }) => {
    const { chapterId } = parseParams(z.object({ chapterId: z.uuid() }), req)
    const updates = parseBody(updateChapterSchema, req)

    await authorize(req, { scope: 'school', permissions: { content: ['update'] } })
    const existing = await findChapterById(ctx.db, chapterId, authoringView)
    if (!existing) {
      throw notFound()
    }

    const updated = await updateChapter(ctx.db, chapterId, updates)
    res.status(200).json({ ok: true, data: updated })
  }),
)

const applyScriptSchema = z.object({
  objectKey: z.string().min(1),
  script: z.enum(['te', 'sa', 'en']),
})

router.post(
  '/:chapterId/script',
  schoolRoute(async ({ req, res, ctx }) => {
    const { chapterId } = parseParams(z.object({ chapterId: z.uuid() }), req)
    const { objectKey, script } = parseBody(applyScriptSchema, req)

    await authorize(req, { scope: 'school', permissions: { content: ['update'] } })
    const updated = await applyChapterScript(ctx.db, chapterId, script, objectKey)
    res.status(200).json({ ok: true, data: updated })
  }),
)

router.post(
  '/:chapterId/script/presign',
  schoolRoute(async ({ req, res, ctx }) => {
    const { chapterId } = parseParams(z.object({ chapterId: z.uuid() }), req)

    await authorize(req, { scope: 'school', permissions: { content: ['update'] } })
    const result = await objectLifecycle.stageChapterTextUpload({
      schoolId: ctx.school.id,
      chapterId,
    })
    res.status(200).json({ ok: true, data: result })
  }),
)

export default router
