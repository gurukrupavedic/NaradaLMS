import { Router } from 'express'
import { z } from 'zod'

import { userIdSchema } from '@narada/auth/ids'
import { parseBody, parseParams, parseQuery } from '../utils/validate'
import { getSession, requireBatchAccess } from '../utils/auth'
import EvaluationService, {
  createEvaluationSchema,
  listEvaluationsQuerySchema,
} from '../services/evaluation'
import BatchService from '../services/batch'
import EnrollmentService from '../services/enrollment'
import { schoolDb } from '../middlewares/school'
import { notFound, unprocessable } from '../error'

const router = Router({ mergeParams: true })

router.get('/', async (req, res) => {
  const db = schoolDb(res)
  const { batchId } = parseParams(z.object({ batchId: z.uuid() }), req)
  const query = parseQuery(listEvaluationsQuerySchema, req)
  await requireBatchAccess(req, db, batchId, {
    schoolPermission: { evaluation: ['read'] },
    batchPermission: { evaluation: ['create'] },
  })

  const result = await EvaluationService.findByBatch(db, batchId, query)
  res.status(200).json({ ok: true, data: result })
})

router.get('/:studentId', async (req, res) => {
  const db = schoolDb(res)
  const { batchId, studentId } = parseParams(
    z.object({ batchId: z.uuid(), studentId: userIdSchema }),
    req,
  )

  const query = parseQuery(listEvaluationsQuerySchema, req)
  const { user } = await getSession(req)
  if (studentId !== user.id) {
    await requireBatchAccess(req, db, batchId, {
      schoolPermission: { evaluation: ['read'] },
      batchPermission: { evaluation: ['create'] },
    })
  } else {
    await requireBatchAccess(req, db, batchId, {
      schoolPermission: { evaluation: ['read'] },
      batchPermission: { evaluation: ['read'] },
    })
  }

  const result = await EvaluationService.findByStudent(db, batchId, studentId, query)
  res.status(200).json({ ok: true, data: result })
})

router.post('/', async (req, res) => {
  const db = schoolDb(res)
  const { batchId } = parseParams(z.object({ batchId: z.uuid() }), req)
  const data = parseBody(createEvaluationSchema, req)
  const access = await requireBatchAccess(req, db, batchId, {
    batchPermission: { evaluation: ['create'] },
  })

  const studentEnrollment = await EnrollmentService.findOne(db, data.studentId, batchId)
  if (!studentEnrollment || studentEnrollment.role !== 'student') {
    throw unprocessable('student is not enrolled in this batch')
  }

  const chapter = await db.query.chapter.findFirst({
    where: (t, { eq }) => eq(t.id, data.chapterId),
    columns: { trackId: true },
  })

  if (!chapter) throw notFound()
  const batch = await BatchService.findById(db, batchId)
  if (!batch) throw notFound()
  if (chapter.trackId !== batch.trackId) {
    throw unprocessable('chapter does not belong to this batch track')
  }

  const created = await EvaluationService.create(db, access.userId, data)
  res.status(201).json({ ok: true, data: created })
})

export default router
