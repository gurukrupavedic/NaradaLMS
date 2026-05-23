import { Router } from 'express'
import { z } from 'zod'

import AuthClient from '../utils/auth'
import { parseBody, parseParams } from '../utils/validate'
import { notFound } from '../error'
import TrackService from '../services/track'

const router = Router()

router.get('/', async (req, res) => {
  const db = res.locals.db
  const authClient = new AuthClient(req, db)
  const [_, includeDrafts] = await Promise.all([
    authClient.ensureSchoolPermissions({ content: ['read'] }),
    authClient.hasSchoolPermissions({ content: ['create'] }),
  ])

  const tracks = await TrackService.findAll(db, includeDrafts)
  res.json({ ok: true, data: tracks })
})

router.get('/:trackId', async (req, res) => {
  const { trackId } = parseParams(z.object({ trackId: z.uuid() }), req)

  const db = res.locals.db
  const authClient = new AuthClient(req, db)
  const [_, includeDrafts] = await Promise.all([
    authClient.ensureSchoolPermissions({ content: ['read'] }),
    authClient.hasSchoolPermissions({ content: ['create'] }),
  ])

  const track = await TrackService.findById(db, trackId, includeDrafts)
  if (!track) {
    throw notFound()
  }

  res.json({ ok: true, data: track })
})

router.post('/', async (req, res) => {
  const { name } = parseBody(z.object({ name: z.string().min(1) }), req)

  const db = res.locals.db
  const authClient = new AuthClient(req, db)
  await authClient.ensureSchoolPermissions({ content: ['create'] })
  const created = await TrackService.create(db, name)
  res.status(201).json({ ok: true, data: created })
})

router.patch('/:trackId', async (req, res) => {
  const { trackId } = parseParams(z.object({ trackId: z.uuid() }), req)
  const updateData = parseBody(
    z.object({
      name: z.string().min(1).optional(),
      order: z.number().int().positive().optional(),
    }),
    req,
  )

  const db = res.locals.db
  const authClient = new AuthClient(req, db)
  await authClient.ensureSchoolPermissions({ content: ['update'] })
  const existing = await TrackService.findById(db, trackId, true)
  if (!existing) {
    throw notFound()
  }

  const updated = await TrackService.update(db, trackId, updateData)
  res.json({ ok: true, data: updated })
})

export default router
