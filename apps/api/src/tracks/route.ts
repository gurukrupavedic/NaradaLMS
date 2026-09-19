import { Router } from 'express'
import * as z from 'zod'

import { optionalProfileRoute } from '../naradaRoute'
import { parse } from '../utils/validate'
import { findAll, findById, reorderChapters } from './service'
import { ReorderChaptersSchema } from './schema'

const router = Router()

router.get(
  '/',
  optionalProfileRoute(async ({ res, db, access, getCourse }) => {
    const view = access.getContentReadView()
    const tracks = await findAll({ db }, view, (await getCourse())?.id)
    res.status(200).json({ data: tracks })
  }),
)

router.get(
  '/:trackId',
  optionalProfileRoute(async ({ req, res, db, access }) => {
    const { trackId } = await parse(z.object({ trackId: z.uuid() }), req.params)
    const view = access.getContentReadView()
    const track = await findById({ db }, trackId, view)
    res.status(200).json({ data: track })
  }),
)

router.put(
  '/:trackId/chapters/order',
  optionalProfileRoute(async ({ req, res, db, access }) => {
    const { trackId } = await parse(z.object({ trackId: z.uuid() }), req.params)
    access.requireCanUpdateContent()
    const { chapterIds } = await parse(ReorderChaptersSchema, req.body)
    const track = await reorderChapters({ db }, trackId, chapterIds)
    res.status(200).json({ data: track })
  }),
)

export default router
