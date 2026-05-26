import { Router, type Response } from 'express'
import { z } from 'zod'

import { parseBody, parseParams } from '../utils/validate'
import AudioService, { getUploadUrlSchema } from '../services/audio'
import { getUploadUrl } from '@narada/storage'
import type { SchoolScopedLocals } from '../middlewares/school'

const router = Router()

router.post(
  '/chapters/:chapterId/audio',
  async (req, res: Response<unknown, SchoolScopedLocals>) => {
    const { authClient } = res.locals
    const { chapterId } = parseParams(z.object({ chapterId: z.uuid() }), req)
    const { contentType } = parseBody(getUploadUrlSchema, req)

    await authClient.ensureSchoolPermissions({ content: ['update'] })
    const { school } = res.locals
    const result = await AudioService.getUploadUrl(school.id, chapterId, contentType)
    res.status(200).json({ ok: true, data: result })
  },
)

router.post(
  '/chapters/:chapterId/script',
  async (req, res: Response<unknown, SchoolScopedLocals>) => {
    const { authClient } = res.locals
    const { chapterId } = parseParams(z.object({ chapterId: z.uuid() }), req)

    await authClient.ensureSchoolPermissions({ content: ['update'] })
    const { school } = res.locals
    const objectKey = `schools/${school.id}/chapters/${chapterId}/text.txt`
    const { uploadUrl } = await getUploadUrl(objectKey, 'text/plain')
    res.status(200).json({ ok: true, data: { uploadUrl, objectKey } })
  },
)

export default router
