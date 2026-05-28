import { Router, type Response } from 'express'
import { z } from 'zod'

import { parseBody, parseParams } from '../utils/validate'
import AudioService, { createAudioAssetSchema, getUploadUrlSchema } from '../services/audio'
import { schoolDb, type SchoolScopedLocals } from '../middlewares/school'
import { authorize } from '../utils/auth'

const router = Router({ mergeParams: true })

router.post('/presign', async (req, res: Response<unknown, SchoolScopedLocals>) => {
  const { school } = res.locals
  const { chapterId } = parseParams(z.object({ chapterId: z.uuid() }), req)
  const { contentType } = parseBody(getUploadUrlSchema, req)

  await authorize(req, { scope: 'school', permissions: { content: ['update'] } })
  const result = await AudioService.getUploadUrl(school.id, chapterId, contentType)
  res.status(200).json({ ok: true, data: result })
})

router.post('/', async (req, res: Response<unknown, SchoolScopedLocals>) => {
  const db = schoolDb(res)
  const { school } = res.locals
  const { chapterId } = parseParams(z.object({ chapterId: z.uuid() }), req)
  const data = parseBody(createAudioAssetSchema, req)

  await authorize(req, { scope: 'school', permissions: { content: ['update'] } })
  const { created, asset } = await AudioService.create(db, school.id, chapterId, data)
  const status = created ? 201 : 200
  res.status(status).json({ ok: true, data: asset })
})

router.delete('/:audioId', async (req, res) => {
  const db = schoolDb(res)
  const { chapterId, audioId } = parseParams(
    z.object({ chapterId: z.uuid(), audioId: z.uuid() }),
    req,
  )

  await authorize(req, { scope: 'school', permissions: { content: ['update'] } })
  await AudioService.remove(db, audioId, chapterId)
  res.status(204).send()
})

export default router
