import { Router } from 'express'
import { z } from 'zod'

import { parseBody, parseParams } from '../utils/validate'
import { notFound } from '../error'
import ChapterService from '../services/chapter'
import SegmentService, { putSegmentsSchema } from '../services/segment'

const router = Router({ mergeParams: true })

router.get('/', async (req, res) => {
  const { db, authClient } = res.locals
  const { chapterId } = parseParams(z.object({ chapterId: z.uuid() }), req)

  await authClient.ensureSchoolPermissions({ content: ['read'] })
  const includeDrafts = await authClient.hasSchoolPermissions({ draft: ['read'] })
  const chapter = await ChapterService.findById(db, chapterId, includeDrafts)
  if (!chapter) {
    throw notFound()
  }

  const segments = await SegmentService.findByChapter(db, chapterId)
  res.status(200).json({ ok: true, data: segments })
})

router.put('/', async (req, res) => {
  const { db, authClient } = res.locals
  const { chapterId } = parseParams(z.object({ chapterId: z.uuid() }), req)
  const inputs = parseBody(putSegmentsSchema, req)

  await authClient.ensureSchoolPermissions({ content: ['update'] })
  const chapter = await ChapterService.findById(db, chapterId, true)
  if (!chapter) {
    throw notFound()
  }

  const segments = await SegmentService.replace(db, chapterId, inputs)
  res.status(200).json({ ok: true, data: segments })
})

export default router
