import { Router, type Response } from 'express'
import { z } from 'zod'

import { parseBody, parseParams } from '../utils/validate'
import AudioService, { createAudioAssetSchema } from '../services/audio'
import type { SchoolScopedLocals } from '../middlewares/school'
import { authorize } from '../utils/auth'

const router = Router({ mergeParams: true })

router.post('/', async (req, res: Response<unknown, SchoolScopedLocals>) => {
  const { db, school } = res.locals
  const { chapterId } = parseParams(z.object({ chapterId: z.uuid() }), req)
  const data = parseBody(createAudioAssetSchema, req)

  await authorize(req, db, { scope: 'school', permissions: { content: ['update'] } })
  const asset = await AudioService.create(db, school.id, chapterId, data)
  res.status(201).json({ ok: true, data: asset })
})

router.delete('/:audioId', async (req, res) => {
  const { db } = res.locals
  const { chapterId, audioId } = parseParams(
    z.object({ chapterId: z.uuid(), audioId: z.uuid() }),
    req,
  )

  await authorize(req, db, { scope: 'school', permissions: { content: ['update'] } })
  await AudioService.remove(db, audioId, chapterId)
  res.status(204).send()
})

export default router
