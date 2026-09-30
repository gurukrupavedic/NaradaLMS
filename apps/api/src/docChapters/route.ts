import { Router } from 'express'
import multer from 'multer'
import * as z from 'zod'

import { badRequest } from '../error'
import { optionalProfileRoute } from '../naradaRoute'
import { parse } from '../utils/validate'
import { listDocChaptersQuerySchema } from './schema'
import { getJobStatus, listDocChapters, uploadDocSet } from './service'

// mergeParams: mounted at /courses/:courseId/doc-chapters in routes.ts.
const router = Router({ mergeParams: true })

const MAX_FILE_SIZE_BYTES = 20 * 1024 * 1024 // a .docx with no embedded media is tiny; generous headroom, not a real ceiling

// Some browsers/clients send the generic octet-stream type for a .docx rather than its real one,
// so the extension is checked too — either signal passing is enough to admit the file. This is
// only a fast, cheap rejection of an obviously-wrong upload, not a security boundary: the real
// validation is `parseDocxParagraphs` (docChapters/parse/docx.ts) throwing a clear error for
// anything that isn't actually a valid .docx zip, which surfaces async as the job's failure reason
// rather than ever risking a request-path crash.
const DOCX_MIMETYPE = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_FILE_SIZE_BYTES },
  fileFilter: (_req, file, callback) => {
    if (file.mimetype !== DOCX_MIMETYPE && !file.originalname.toLowerCase().endsWith('.docx')) {
      callback(badRequest(`${file.fieldname}: expected a .docx file`))
      return
    }
    callback(null, true)
  },
})

const CourseParamsSchema = z.object({ courseId: z.uuid() })
const JobParamsSchema = CourseParamsSchema.extend({ jobId: z.string().min(1) })

router.post(
  '/upload',
  upload.fields([
    { name: 'sa', maxCount: 1 },
    { name: 'te', maxCount: 1 },
    { name: 'en', maxCount: 1 },
  ]),
  optionalProfileRoute(async ({ req, res, db, school, profile, access }) => {
    const { courseId } = await parse(CourseParamsSchema, req.params)
    access.requireCanUpdateContent()

    const files = req.files as Record<string, Express.Multer.File[]> | undefined
    const sa = files?.sa?.[0]
    const te = files?.te?.[0]
    const en = files?.en?.[0]
    if (!sa || !te || !en) {
      throw badRequest('sa, te, and en source documents are all required')
    }
    if (sa.buffer.length === 0 || te.buffer.length === 0 || en.buffer.length === 0) {
      throw badRequest('sa, te, and en source documents must not be empty')
    }

    const result = await uploadDocSet({ db, schoolId: school.id }, courseId, profile?.id, { sa, te, en })
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
