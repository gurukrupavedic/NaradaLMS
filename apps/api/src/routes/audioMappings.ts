import { Router } from 'express'
import { z } from 'zod'

import { parseBody, parseParams } from '../utils/validate'
import { notFound } from '../error'
import { authorize } from '../utils/auth'
import AudioService from '../services/audio'
import AudioMappingService, { putMappingsSchema } from '../services/audioMapping'
import { schoolDb } from '../middlewares/school'

const router = Router()

router.put('/:audioId/mappings', async (req, res) => {
  const db = schoolDb(res)
  const { audioId } = parseParams(z.object({ audioId: z.uuid() }), req)
  const inputs = parseBody(putMappingsSchema, req)

  await authorize(req, { scope: 'school', permissions: { content: ['update'] } })
  const asset = await AudioService.findById(db, audioId)
  if (!asset) {
    throw notFound()
  }

  const mappings = await AudioMappingService.replace(db, audioId, asset.chapterId, inputs)
  res.status(200).json({ ok: true, data: mappings })
})

export default router
