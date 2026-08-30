import { Router } from 'express'
import * as z from 'zod'

import { optionalProfileRoute } from '../naradaRoute'
import { parse } from '../utils/validate'
import { findById } from './service'

const router = Router()

router.get(
  '/:chapterId',
  optionalProfileRoute(async ({ req, res, db, access }) => {
    const { chapterId } = await parse(z.object({ chapterId: z.uuid() }), req.params)
    const view = access.getContentReadView()
    const chapter = await findById({ db }, chapterId, view)
    res.status(200).json({ data: chapter })
  }),
)

export default router
