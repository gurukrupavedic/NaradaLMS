import { Router } from 'express'
import { z } from 'zod'

import { parseBody, parseParams } from '../utils/validate'
import { notFound } from '../error'
import TrackService, { createTrackSchema, updateTrackSchema } from '../services/track'

const router = Router()

router.get('/', async (req, res) => {
  const { db, authClient } = res.locals
  const [_, includeDrafts] = await Promise.all([
    authClient.ensureSchoolPermissions({ content: ['read'] }),
    authClient.hasSchoolPermissions({ content: ['create'] }),
  ])

  const tracks = await TrackService.findAll(db, includeDrafts)
  res.status(200).json({ ok: true, data: tracks })
})

router.get('/:trackId', async (req, res) => {
  const { db, authClient } = res.locals
  const { trackId } = parseParams(z.object({ trackId: z.uuid() }), req)

  const [_, includeDrafts] = await Promise.all([
    authClient.ensureSchoolPermissions({ content: ['read'] }),
    authClient.hasSchoolPermissions({ content: ['create'] }),
  ])

  const track = await TrackService.findById(db, trackId, includeDrafts)
  if (!track) {
    throw notFound()
  }

  res.status(200).json({ ok: true, data: track })
})

router.post('/', async (req, res) => {
  const { db, authClient } = res.locals
  const data = parseBody(createTrackSchema, req)

  await authClient.ensureSchoolPermissions({ content: ['create'] })
  const created = await TrackService.create(db, data)
  res.status(201).json({ ok: true, data: created })
})

router.patch('/:trackId', async (req, res) => {
  const { db, authClient } = res.locals
  const { trackId } = parseParams(z.object({ trackId: z.uuid() }), req)
  const updateData = parseBody(updateTrackSchema, req)

  await authClient.ensureSchoolPermissions({ content: ['update'] })
  const existing = await TrackService.findById(db, trackId, true)
  if (!existing) {
    throw notFound()
  }

  const updated = await TrackService.update(db, trackId, updateData)
  res.status(200).json({ ok: true, data: updated })
})

export default router
