import { Router } from 'express'
import { z } from 'zod'

import { naradaRoute, requireSchoolContext } from '../naradaRoute'
import { parseBody, parseParams } from '../utils/validate'
import { notFound } from '../error'
import { authorize } from '../utils/auth'
import { authoringView, authorizeContentReadView } from '../utils/chapterView'
import {
  createTrack,
  createTrackSchema,
  findTrackById,
  findTracks,
  reorderTracks,
  reorderTracksSchema,
  updateTrack,
  updateTrackSchema,
} from '../services/track'
import { reorderChapters, reorderChaptersSchema } from '../services/chapter'

const router = Router()

router.get(
  '/',
  naradaRoute(async ({ req, res, ctx }) => {
    const { db } = requireSchoolContext(ctx)
    const view = await authorizeContentReadView(req)

    const tracks = await findTracks(db, view)
    res.status(200).json({ ok: true, data: tracks })
  }),
)

router.get(
  '/:trackId',
  naradaRoute(async ({ req, res, ctx }) => {
    const { db } = requireSchoolContext(ctx)
    const { trackId } = parseParams(z.object({ trackId: z.uuid() }), req)

    const view = await authorizeContentReadView(req)
    const track = await findTrackById(db, trackId, view)
    if (!track) {
      throw notFound()
    }

    res.status(200).json({ ok: true, data: track })
  }),
)

router.post(
  '/',
  naradaRoute(async ({ req, res, ctx }) => {
    const { db } = requireSchoolContext(ctx)
    const data = parseBody(createTrackSchema, req)

    await authorize(req, { scope: 'school', permissions: { content: ['create'] } })
    const created = await createTrack(db, data)
    res.status(201).json({ ok: true, data: created })
  }),
)

router.put(
  '/order',
  naradaRoute(async ({ req, res, ctx }) => {
    const { db } = requireSchoolContext(ctx)
    const data = parseBody(reorderTracksSchema, req)

    await authorize(req, { scope: 'school', permissions: { content: ['update'] } })
    const tracks = await reorderTracks(db, data)
    res.status(200).json({ ok: true, data: tracks })
  }),
)

router.patch(
  '/:trackId',
  naradaRoute(async ({ req, res, ctx }) => {
    const { db } = requireSchoolContext(ctx)
    const { trackId } = parseParams(z.object({ trackId: z.uuid() }), req)
    const updateData = parseBody(updateTrackSchema, req)

    await authorize(req, { scope: 'school', permissions: { content: ['update'] } })
    const existing = await findTrackById(db, trackId, authoringView)
    if (!existing) {
      throw notFound()
    }

    const updated = await updateTrack(db, trackId, updateData)
    res.status(200).json({ ok: true, data: updated })
  }),
)

router.put(
  '/:trackId/chapters/order',
  naradaRoute(async ({ req, res, ctx }) => {
    const { db } = requireSchoolContext(ctx)
    const { trackId } = parseParams(z.object({ trackId: z.uuid() }), req)
    const data = parseBody(reorderChaptersSchema, req)

    await authorize(req, { scope: 'school', permissions: { content: ['update'] } })
    const existing = await findTrackById(db, trackId, authoringView)
    if (!existing) {
      throw notFound()
    }

    const chapters = await reorderChapters(db, trackId, data)
    res.status(200).json({ ok: true, data: chapters })
  }),
)

export default router
