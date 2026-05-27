import { Router, type Response } from 'express'
import { z } from 'zod'

import { parseBody, parseParams } from '../utils/validate'
import AudioService, { getUploadUrlSchema } from '../services/audio'
import { objectLifecycle } from '../utils/objectLifecycle'
import type { SchoolScopedLocals } from '../middlewares/school'
import { authorize } from '../utils/auth'

const router = Router()

router.post(
  '/chapters/:chapterId/audio',
  async (req, res: Response<unknown, SchoolScopedLocals>) => {
    const { chapterId } = parseParams(z.object({ chapterId: z.uuid() }), req)
    const { contentType } = parseBody(getUploadUrlSchema, req)

    await authorize(req, res.locals.db, { scope: 'school', permissions: { content: ['update'] } })
    const { school } = res.locals
    const result = await AudioService.getUploadUrl(school.id, chapterId, contentType)
    res.status(200).json({ ok: true, data: result })
  },
)

router.post(
  '/chapters/:chapterId/script',
  async (req, res: Response<unknown, SchoolScopedLocals>) => {
    const { chapterId } = parseParams(z.object({ chapterId: z.uuid() }), req)

    await authorize(req, res.locals.db, { scope: 'school', permissions: { content: ['update'] } })
    const { school } = res.locals
    const result = await objectLifecycle.stageChapterTextUpload({ schoolId: school.id, chapterId })
    res.status(200).json({ ok: true, data: result })
  },
)

export default router
