import { Router } from 'express'
import * as z from 'zod'

import { profileRoute } from '../naradaRoute'
import { parse } from '../utils/validate'
import {
  CreateExamSchema,
  FindExamsSchema,
  RecordExamResultSchema,
  UpdateExamSchema,
} from './schema'
import { createExam, findById, findExams, recordExamResult, updateExam } from './service'

const router = Router()

router.get(
  '/',
  profileRoute(async ({ req, res, db, access }) => {
    const query = await parse(FindExamsSchema, req.query)
    const visibility = await access.getExamVisibility()
    const exams = await findExams({ db }, query, visibility)
    res.status(200).json({ data: exams })
  }),
)

router.get(
  '/:examId',
  profileRoute(async ({ req, res, db, access }) => {
    const { examId } = await parse(z.object({ examId: z.uuid() }), req.params)
    const exam = await findById({ db }, examId)
    await access.requireCanReadExam(exam)
    res.status(200).json({ data: exam })
  }),
)

// createExam itself calls access.requireCanCreateExam once it has resolved the qualifying batch
// — see the doc comment on createExam for why that check can't happen here, before the body (and
// therefore the student/chapter) is even parsed.
router.post(
  '/',
  profileRoute(async ({ req, res, db, access }) => {
    const data = await parse(CreateExamSchema, req.body)
    const exam = await createExam({ db, access }, data)
    res.status(201).json({ data: exam })
  }),
)

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
    const existing = await findById({ db }, examId)
    await access.requireCanRecordEvaluation(existing)
    const data = await parse(RecordExamResultSchema, req.body)
    const exam = await recordExamResult({ db }, examId, profile.id, data)
    res.status(200).json({ data: exam })
  }),
)

export default router
