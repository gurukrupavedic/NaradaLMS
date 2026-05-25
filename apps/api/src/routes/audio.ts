import { Router } from 'express'
import { z } from 'zod'

import { parseBody, parseParams } from '../utils/validate'
import AudioService, { createAudioAssetSchema } from '../services/audio'
import { badRequest } from '../error'

const router = Router({ mergeParams: true })

router.post('/', async (req, res) => {
  const { db, authClient, school } = res.locals
  const { chapterId } = parseParams(z.object({ chapterId: z.uuid() }), req)
  const data = parseBody(createAudioAssetSchema, req)

  await authClient.ensureSchoolPermissions({ content: ['update'] })
  if (!school) {
    throw badRequest()
  }

  const asset = await AudioService.create(db, school.id, chapterId, data)
  res.status(201).json({ ok: true, data: asset })
})

router.delete('/:audioId', async (req, res) => {
  const { db, authClient } = res.locals
  const { chapterId, audioId } = parseParams(
    z.object({ chapterId: z.uuid(), audioId: z.uuid() }),
    req,
  )

  await authClient.ensureSchoolPermissions({ content: ['update'] })
  await AudioService.remove(db, audioId, chapterId)
  res.status(204).send()
})

export default router
