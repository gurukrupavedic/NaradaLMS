import { Router } from 'express'
import { z } from 'zod'

import { naradaRoute, requireSchoolContext } from '../naradaRoute'
import { parseBody, parseParams } from '../utils/validate'
import { notFound } from '../error'
import { authorize } from '../utils/auth'
import { findAudioAssetById } from '../services/audio'
import { putMappingsSchema, replaceAudioMappings } from '../services/audioMapping'

const router = Router()

router.put(
  '/:audioId/mappings',
  naradaRoute(async ({ req, res, ctx }) => {
    const { db } = requireSchoolContext(ctx)
    const { audioId } = parseParams(z.object({ audioId: z.uuid() }), req)
    const inputs = parseBody(putMappingsSchema, req)

    await authorize(req, { scope: 'school', permissions: { content: ['update'] } })
    const asset = await findAudioAssetById(db, audioId)
    if (!asset) {
      throw notFound()
    }

    const mappings = await replaceAudioMappings(db, audioId, asset.chapterId, inputs)
    res.status(200).json({ ok: true, data: mappings })
  }),
)

export default router
