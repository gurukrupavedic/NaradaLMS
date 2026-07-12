import { Router } from 'express'
import { z } from 'zod'

import { schoolRoute } from '../naradaRoute'
import { parseParams } from '../utils/validate'
import { notFound } from '../error'
import { authorizeContentReadView } from '../utils/chapterView'
import { findTrackById, findTracks } from '../services/track'

const router = Router()

router.get(
  '/',
  schoolRoute(async ({ req, res, ctx }) => {
    const view = await authorizeContentReadView(req)
    const tracks = await findTracks(ctx.db, view)
    res.status(200).json({ ok: true, data: tracks })
  }),
)

router.get(
  '/:trackId',
  schoolRoute(async ({ req, res, ctx }) => {
    const { trackId } = parseParams(z.object({ trackId: z.uuid() }), req)
    const view = await authorizeContentReadView(req)
    const track = await findTrackById(ctx.db, trackId, view)
    if (!track) {
      throw notFound()
    }

    res.status(200).json({ ok: true, data: track })
  }),
)

export default router
