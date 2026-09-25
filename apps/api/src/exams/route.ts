import { Router } from 'express'
import * as z from 'zod'

import { optionalProfileRoute, profileRoute } from '../naradaRoute'
import { parse } from '../utils/validate'
import { FindExamsSchema, RecordExamResultSchema, UpdateExamSchema } from './schema'
import { correctExamResult, findById, findExams, recordExamResult, updateExam } from './service'

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

// There is no POST here: a sitting is booked by approving an exam-slot request (`examSlots/service.ts`,
// which calls `service.ts::createExam`).

router.patch(
  '/:examId',
  profileRoute(async ({ req, res, db, access }) => {
    const { examId } = await parse(z.object({ examId: z.uuid() }), req.params)
    const existing = await findById({ db }, examId)
    await access.requireCanUpdateExam(existing)
    const data = await parse(UpdateExamSchema, req.body)
    const exam = await updateExam({ db }, examId, data)
    res.status(200).json({ data: exam })
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
