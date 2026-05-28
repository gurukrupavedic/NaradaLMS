import { Router } from 'express'
import { z } from 'zod'

import { parseBody, parseParams } from '../utils/validate'
import { notFound } from '../error'
import { authorize } from '../utils/auth'
import { authoringView, authorizeContentReadView } from '../utils/chapterView'
import TrackService, { createTrackSchema, updateTrackSchema } from '../services/track'
import { schoolDb } from '../middlewares/school'

const router = Router()

router.get('/', async (req, res) => {
  const db = schoolDb(res)
  const view = await authorizeContentReadView(req)

  const tracks = await TrackService.findAll(db, view)
  res.status(200).json({ ok: true, data: tracks })
})

router.get('/:trackId', async (req, res) => {
  const db = schoolDb(res)
  const { trackId } = parseParams(z.object({ trackId: z.uuid() }), req)

  const view = await authorizeContentReadView(req)
  const track = await TrackService.findById(db, trackId, view)
  if (!track) {
    throw notFound()
  }

  res.status(200).json({ ok: true, data: track })
})

router.post('/', async (req, res) => {
  const db = schoolDb(res)
  const data = parseBody(createTrackSchema, req)

  await authorize(req, { scope: 'school', permissions: { content: ['create'] } })
  const created = await TrackService.create(db, data)
  res.status(201).json({ ok: true, data: created })
})

router.patch('/:trackId', async (req, res) => {
  const db = schoolDb(res)
  const { trackId } = parseParams(z.object({ trackId: z.uuid() }), req)
  const updateData = parseBody(updateTrackSchema, req)

  await authorize(req, { scope: 'school', permissions: { content: ['update'] } })
  const existing = await TrackService.findById(db, trackId, authoringView)
  if (!existing) {
    throw notFound()
  }

  const updated = await TrackService.update(db, trackId, updateData)
  res.status(200).json({ ok: true, data: updated })
})

export default router
