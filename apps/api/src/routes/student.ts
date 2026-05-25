import { Router } from 'express'
import { z } from 'zod'

import { parseParams } from '../utils/validate'
import { notFound } from '../error'
import StudentService from '../services/student'

const router = Router()

router.get('/chapters/:chapterId', async (req, res) => {
  const { db, authClient } = res.locals
  const { chapterId } = parseParams(z.object({ chapterId: z.uuid() }), req)

  await authClient.ensureSchoolPermissions({ content: ['read'] })
  const { user } = await authClient.getSession()
  const chapter = await StudentService.getChapter(db, user.id, chapterId)
  if (!chapter) {
    throw notFound()
  }

  res.status(200).json({ ok: true, data: chapter })
})

export default router
