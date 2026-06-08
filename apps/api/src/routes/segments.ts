import { Router } from 'express'
import { z } from 'zod'

import { parseBody, parseParams } from '../utils/validate'
import { notFound } from '../error'
import { authorize } from '../utils/auth'
import { authoringView, authorizeContentReadView } from '../utils/chapterView'
import { findChapterById, findSegmentsByChapter } from '../services/chapterReader'
import { putSegmentsSchema, replaceSegments } from '../services/segment'
import { schoolDb } from '../middlewares/school'

// mergeParams: parent path provides :chapterId.
const router = Router({ mergeParams: true })

router.get('/', async (req, res) => {
  const db = schoolDb(res)
  const { chapterId } = parseParams(z.object({ chapterId: z.uuid() }), req)

  const view = await authorizeContentReadView(req)
  const segments = await findSegmentsByChapter(db, chapterId, view)
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
  const chapter = await findChapterById(db, chapterId, authoringView)
  if (!chapter) {
    throw notFound()
  }

  const segments = await replaceSegments(db, chapterId, inputs)
  res.status(200).json({ ok: true, data: segments })
})

export default router
