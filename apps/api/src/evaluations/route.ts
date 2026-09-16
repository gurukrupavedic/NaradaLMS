import { Router } from 'express'
import * as z from 'zod'

import { optionalProfileRoute, profileRoute } from '../naradaRoute'
import { parse } from '../utils/validate'
import { CreateEvaluationsSchema, FindEvaluationsSchema } from './schema'
import { createEvaluations, findByBatch, findByStudent } from './service'

// mergeParams: mounted at /batches/:batchId/evaluations in routes.ts — this router needs the
// parent mount path's :batchId, not just its own path segments.
const router = Router({ mergeParams: true })

const BatchParamsSchema = z.object({ batchId: z.uuid() })
const StudentParamsSchema = BatchParamsSchema.extend({ studentId: z.uuid() })

router.get(
  '/',
  optionalProfileRoute(async ({ req, res, db, access }) => {
    const { batchId } = await parse(BatchParamsSchema, req.params)
    access.requireCanReadBatchEvaluations(batchId)
    const query = await parse(FindEvaluationsSchema, req.query)
    const evaluations = await findByBatch({ db }, batchId, query)
    res.status(200).json({ data: evaluations })
  }),
)

router.get(
  '/:studentId',
  profileRoute(async ({ req, res, db, access }) => {
    const { batchId, studentId } = await parse(StudentParamsSchema, req.params)
    access.requireCanReadStudentEvaluations(batchId, studentId)
    const query = await parse(FindEvaluationsSchema, req.query)
    const evaluations = await findByStudent({ db }, batchId, studentId, query)
    res.status(200).json({ data: evaluations })
  }),
)

// One or many evaluations per request — the grade dialog sends one item, the roster grid's
// "Promote to L3" sends one per not-yet-L3 chapter (see service.ts's `createEvaluations`).
router.post(
  '/',
  profileRoute(async ({ req, res, db, access, profile }) => {
    const { batchId } = await parse(BatchParamsSchema, req.params)
    access.requireCanCreateEvaluation(batchId)
    const data = await parse(CreateEvaluationsSchema, req.body)
    const created = await createEvaluations({ db }, batchId, profile.id, data)
    res.status(201).json({ data: created })
  }),
)

export default router
