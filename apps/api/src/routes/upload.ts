import { Router } from 'express'
import { z } from 'zod'

import { parseBody, parseParams } from '../utils/validate'
import AudioService, { getUploadUrlSchema } from '../services/audio'

const router = Router()

router.post('/chapters/:chapterId/audio', async (req, res) => {
  const { authClient } = res.locals
  const { chapterId } = parseParams(z.object({ chapterId: z.uuid() }), req)
  const { contentType } = parseBody(getUploadUrlSchema, req)

  await authClient.ensureSchoolPermissions({ content: ['update'] })
  const { id: orgId } = res.locals.school

  const result = await AudioService.getUploadUrl(orgId, chapterId, contentType)
  res.status(200).json({ ok: true, data: result })
})

export default router
