import { Router } from 'express'
import { z } from 'zod'

import { parseBody, parseParams } from '../utils/validate'
import { notFound } from '../error'
import { authorize } from '../utils/auth'
import { authoringView, authorizeContentReadView } from '../utils/chapterView'
import ChapterReader from '../services/chapterReader'
import SegmentService, { putSegmentsSchema } from '../services/segment'
import { schoolDb } from '../middlewares/school'

const router = Router({ mergeParams: true })

router.get('/', async (req, res) => {
  const db = schoolDb(res)
  const { chapterId } = parseParams(z.object({ chapterId: z.uuid() }), req)

  const view = await authorizeContentReadView(req)
  const segments = await ChapterReader.findSegmentsByChapter(db, chapterId, view)
  if (!segments) {
    throw notFound()
  }
  res.status(200).json({ ok: true, data: segments })
})

router.put('/', async (req, res) => {
  const db = schoolDb(res)
  const { chapterId } = parseParams(z.object({ chapterId: z.uuid() }), req)
  const inputs = parseBody(putSegmentsSchema, req)

  await authorize(req, { scope: 'school', permissions: { content: ['update'] } })
  const chapter = await ChapterReader.findById(db, chapterId, authoringView)
  if (!chapter) {
    throw notFound()
  }

  const segments = await SegmentService.replace(db, chapterId, inputs)
  res.status(200).json({ ok: true, data: segments })
})

export default router
