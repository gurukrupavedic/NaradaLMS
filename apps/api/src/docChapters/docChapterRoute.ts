import { Router } from 'express'
import * as z from 'zod'

import { optionalProfileRoute } from '../naradaRoute'
import { parse } from '../utils/validate'
import { splitSegmentRequestSchema } from './schema'
import { deleteSegment, getDocChapterDetail, mergeSegmentWithNext, splitSegment } from './service'

// Mounted at /doc-chapters in routes.ts — flat, not nested under a course, matching
// chapters/route.ts's GET /:chapterId (a doc chapter's id alone is enough to operate on it; every
// endpoint here is admin-only, so there's no reader-facing course-scoping to enforce).
const router = Router()

const DocChapterParamsSchema = z.object({ docChapterId: z.uuid() })
const SegmentParamsSchema = DocChapterParamsSchema.extend({ segmentId: z.uuid() })

router.get(
  '/:docChapterId',
  optionalProfileRoute(async ({ req, res, db, access }) => {
    const { docChapterId } = await parse(DocChapterParamsSchema, req.params)
    access.requireCanUpdateContent()
    res.status(200).json({ data: await getDocChapterDetail(db, docChapterId) })
  }),
)

router.post(
  '/:docChapterId/segments/:segmentId/split',
  optionalProfileRoute(async ({ req, res, db, access }) => {
    const { docChapterId, segmentId } = await parse(SegmentParamsSchema, req.params)
    access.requireCanUpdateContent()
    const data = await parse(splitSegmentRequestSchema, req.body)
    res.status(200).json({ data: await splitSegment(db, docChapterId, segmentId, data) })
  }),
)

router.post(
  '/:docChapterId/segments/:segmentId/merge-next',
  optionalProfileRoute(async ({ req, res, db, access }) => {
    const { docChapterId, segmentId } = await parse(SegmentParamsSchema, req.params)
    access.requireCanUpdateContent()
    res.status(200).json({ data: await mergeSegmentWithNext(db, docChapterId, segmentId) })
  }),
)

router.delete(
  '/:docChapterId/segments/:segmentId',
  optionalProfileRoute(async ({ req, res, db, access }) => {
    const { docChapterId, segmentId } = await parse(SegmentParamsSchema, req.params)
    access.requireCanUpdateContent()
    res.status(200).json({ data: await deleteSegment(db, docChapterId, segmentId) })
  }),
)

export default router
