import { Router } from 'express'
import { z } from 'zod'

import { parseParams } from '../utils/validate'
import { notFound } from '../error'
import { authorize } from '../utils/auth'
import ChapterReader from '../services/chapterReader'
import { schoolDb } from '../middlewares/school'

const router = Router()

router.get('/chapters/:chapterId', async (req, res) => {
  const db = schoolDb(res)
  const { chapterId } = parseParams(z.object({ chapterId: z.uuid() }), req)

  const { user } = await authorize(req, {
    scope: 'school',
    permissions: { content: ['read'] },
  })

  const chapter = await ChapterReader.findById(db, chapterId, {
    kind: 'student',
    studentId: user.id,
  })

  if (!chapter) {
    throw notFound()
  }

  res.status(200).json({ ok: true, data: chapter })
})

export default router
