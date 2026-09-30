import { Router } from 'express'
import * as z from 'zod'

import { optionalProfileRoute } from '../naradaRoute'
import { parse } from '../utils/validate'
import { confirmUploadRequestSchema, listDocChaptersQuerySchema } from './schema'
import { confirmUpload, getJobStatus, listDocChapters, presignUpload } from './service'

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
