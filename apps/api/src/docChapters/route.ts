import { Router } from 'express'
import * as z from 'zod'

import { optionalProfileRoute } from '../naradaRoute'
import { parse } from '../utils/validate'
import { confirmUploadRequestSchema, listDocChaptersQuerySchema, splitSegmentRequestSchema } from './schema'
import {
  confirmUpload,
  deleteSegment,
  getDocChapterDetail,
  getJobStatus,
  listDocChapters,
  mergeSegmentWithNext,
  presignUpload,
  splitSegment,
} from './service'

// mergeParams: mounted at /courses/:courseId/doc-chapters in routes.ts.
const router = Router({ mergeParams: true })

const CourseParamsSchema = z.object({ courseId: z.uuid() })
const JobParamsSchema = CourseParamsSchema.extend({ jobId: z.string().min(1) })

// Presigned upload, not a direct multipart POST to this server: the 3 source documents can be
// tens of MB each and this server has no business sitting in the middle of that transfer. The
// client PUTs each file straight to R2 using the returned URLs, then calls /upload/confirm.
router.post(
  '/upload/presign',
  optionalProfileRoute(async ({ req, res, db, school, access }) => {
    const { courseId } = await parse(CourseParamsSchema, req.params)
    access.requireCanUpdateContent()
    res.status(200).json({ data: await presignUpload({ db, schoolId: school.id }, courseId) })
  }),
)

router.post(
  '/upload/confirm',
  optionalProfileRoute(async ({ req, res, db, school, profile, access }) => {
    const { courseId } = await parse(CourseParamsSchema, req.params)
    access.requireCanUpdateContent()
    const { uploadId } = await parse(confirmUploadRequestSchema, req.body)
    const result = await confirmUpload({ db, schoolId: school.id }, courseId, profile?.id, uploadId)
    res.status(202).json({ data: result })
  }),
)

router.get(
  '/upload/:jobId',
  optionalProfileRoute(async ({ req, res, db, school, access }) => {
    const { courseId, jobId } = await parse(JobParamsSchema, req.params)
    access.requireCanUpdateContent()
    res.status(200).json({ data: await getJobStatus({ db, schoolId: school.id }, courseId, jobId) })
  }),
)

router.get(
  '/',
  optionalProfileRoute(async ({ req, res, db, school, access }) => {
    const { courseId } = await parse(CourseParamsSchema, req.params)
    access.requireCanUpdateContent()
    const { q } = await parse(listDocChaptersQuerySchema, req.query)
    const items = await listDocChapters({ db, schoolId: school.id }, courseId, q)
    res.status(200).json({ data: { items } })
  }),
)

export default router

// A second router, mounted separately and flat at /doc-chapters (not nested under a course) —
// matching chapters/route.ts's GET /:chapterId convention: a doc chapter's id alone is enough to
// operate on it, and every endpoint here is admin-only, so there's no reader-facing course-scoping
// to enforce.
export const docChapterRouter = Router()

const DocChapterParamsSchema = z.object({ docChapterId: z.uuid() })
const SegmentParamsSchema = DocChapterParamsSchema.extend({ segmentId: z.uuid() })

docChapterRouter.get(
  '/:docChapterId',
  optionalProfileRoute(async ({ req, res, db, access }) => {
    const { docChapterId } = await parse(DocChapterParamsSchema, req.params)
    access.requireCanUpdateContent()
    res.status(200).json({ data: await getDocChapterDetail(db, docChapterId) })
  }),
)

docChapterRouter.post(
  '/:docChapterId/segments/:segmentId/split',
  optionalProfileRoute(async ({ req, res, db, access }) => {
    const { docChapterId, segmentId } = await parse(SegmentParamsSchema, req.params)
    access.requireCanUpdateContent()
    const data = await parse(splitSegmentRequestSchema, req.body)
    res.status(200).json({ data: await splitSegment(db, docChapterId, segmentId, data) })
  }),
)

docChapterRouter.post(
  '/:docChapterId/segments/:segmentId/merge-next',
  optionalProfileRoute(async ({ req, res, db, access }) => {
    const { docChapterId, segmentId } = await parse(SegmentParamsSchema, req.params)
    access.requireCanUpdateContent()
    res.status(200).json({ data: await mergeSegmentWithNext(db, docChapterId, segmentId) })
  }),
)

docChapterRouter.delete(
  '/:docChapterId/segments/:segmentId',
  optionalProfileRoute(async ({ req, res, db, access }) => {
    const { docChapterId, segmentId } = await parse(SegmentParamsSchema, req.params)
    access.requireCanUpdateContent()
    res.status(200).json({ data: await deleteSegment(db, docChapterId, segmentId) })
  }),
)
