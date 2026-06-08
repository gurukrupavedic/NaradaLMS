import { Router } from 'express'
import { z } from 'zod'

import { schoolRoute } from '../naradaRoute'
import { parseParams } from '../utils/validate'
import { notFound } from '../error'
import { authorize } from '../utils/auth'
import { findChapterById } from '../services/chapterReader'

const router = Router()

router.get(
  '/chapters/:chapterId',
  schoolRoute(async ({ req, res, ctx }) => {
    const { chapterId } = parseParams(z.object({ chapterId: z.uuid() }), req)

    const { user } = await authorize(req, {
      scope: 'school',
      permissions: { content: ['read'] },
    })

    const chapter = await findChapterById(ctx.db, chapterId, {
      kind: 'student',
      studentId: user.id,
    })

    if (!chapter) {
      throw notFound()
    }

    res.status(200).json({ ok: true, data: chapter })
  }),
)

export default router
