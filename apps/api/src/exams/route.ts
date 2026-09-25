import { Router } from 'express'
import * as z from 'zod'

import { optionalProfileRoute, profileRoute } from '../naradaRoute'
import { parse } from '../utils/validate'
import { CreateExamSchema, FindExamsSchema, RecordExamResultSchema } from './schema'
import { correctExamResult, createExam, findExams, recordExamResult } from './service'

const router = Router()

router.get(
  '/',
  optionalProfileRoute(async ({ req, res, db, access, getCourse }) => {
    const query = await parse(FindExamsSchema, req.query)
    const visibility = query.mine ? access.getOwnExamScope() : access.getExamVisibility()
    const exams = await findExams({ db }, query, visibility, (await getCourse()).id)
    res.status(200).json({ data: exams })
  }),
)

// createExam itself calls access.requireCanCreateExam (school-admin only) before checking the
// student's enrollment — see its doc comment.
router.post(
  '/',
  profileRoute(async ({ req, res, db, access }) => {
    const data = await parse(CreateExamSchema, req.body)
    const exam = await createExam({ db, access }, data)
    res.status(201).json({ data: exam })
  }),
)

router.post(
  '/:examId/results',
  profileRoute(async ({ req, res, db, access, profile }) => {
    const { examId } = await parse(z.object({ examId: z.uuid() }), req.params)
    access.requireCanRecordEvaluation()
    const data = await parse(RecordExamResultSchema, req.body)
    const exam = await recordExamResult({ db }, examId, profile.id, data)
    res.status(200).json({ data: exam })
  }),
)

// A school admin correcting an already-recorded result (a data-entry mistake), not a second
// sitting — same body shape and the same requireCanRecordEvaluation gate as the POST above, since
// a correction can move the certification level exactly like the original grade did.
router.patch(
  '/:examId/results',
  profileRoute(async ({ req, res, db, access, profile }) => {
    const { examId } = await parse(z.object({ examId: z.uuid() }), req.params)
    access.requireCanRecordEvaluation()
    const data = await parse(RecordExamResultSchema, req.body)
    const exam = await correctExamResult({ db }, examId, profile.id, data)
    res.status(200).json({ data: exam })
  }),
)

export default router
