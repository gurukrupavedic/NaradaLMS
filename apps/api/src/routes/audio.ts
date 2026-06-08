import { Router } from 'express'
import { z } from 'zod'

import { schoolRoute } from '../naradaRoute'
import { parseBody, parseParams } from '../utils/validate'
import {
  createAudioAsset,
  createAudioAssetSchema,
  getAudioUploadUrl,
  getUploadUrlSchema,
  removeAudioAsset,
} from '../services/audio'
import { authorize } from '../utils/auth'

// mergeParams: parent path provides :chapterId.
const router = Router({ mergeParams: true })

router.post(
  '/presign',
  schoolRoute(async ({ req, res, ctx }) => {
    const { chapterId } = parseParams(z.object({ chapterId: z.uuid() }), req)
    const { contentType } = parseBody(getUploadUrlSchema, req)

    await authorize(req, { scope: 'school', permissions: { content: ['update'] } })
    const result = await getAudioUploadUrl(ctx.school.id, chapterId, contentType)
    res.status(200).json({ ok: true, data: result })
  }),
)

router.post(
  '/',
  schoolRoute(async ({ req, res, ctx }) => {
    const { chapterId } = parseParams(z.object({ chapterId: z.uuid() }), req)
    const data = parseBody(createAudioAssetSchema, req)

    await authorize(req, { scope: 'school', permissions: { content: ['update'] } })
    const { created, asset } = await createAudioAsset(ctx.db, ctx.school.id, chapterId, data)
    const status = created ? 201 : 200
    res.status(status).json({ ok: true, data: asset })
  }),
)

router.delete(
  '/:audioId',
  schoolRoute(async ({ req, res, ctx }) => {
    const { chapterId, audioId } = parseParams(
      z.object({ chapterId: z.uuid(), audioId: z.uuid() }),
      req,
    )

    await authorize(req, { scope: 'school', permissions: { content: ['update'] } })
    await removeAudioAsset(ctx.db, audioId, chapterId)
    res.status(204).send()
  }),
)

export default router
