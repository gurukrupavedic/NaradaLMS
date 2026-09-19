import { Router } from 'express'
import * as z from 'zod'

import { optionalProfileRoute } from '../naradaRoute'
import { parse } from '../utils/validate'
import { findAll, findByIdForReader, reorderChapters } from './service'
import { ReorderChaptersSchema } from './schema'

const router = Router()

router.get(
  '/',
  optionalProfileRoute(async ({ res, db, access, getCourse }) => {
    const view = access.getContentReadView()
    const course = await getCourse()
    // The request names the course whose tracks it wants, so refusing it outright ("you are not part
    // of this course") discloses nothing. A school with no courses has nothing to gate or list.
    if (course) {
      await access.requireCanReadCourseContent(course.id)
    }
    const tracks = await findAll({ db }, view, course?.id)
    res.status(200).json({ data: tracks })
  }),
)

router.get(
  '/:trackId',
  optionalProfileRoute(async ({ req, res, db, access }) => {
    const { trackId } = await parse(z.object({ trackId: z.uuid() }), req.params)
    const view = access.getContentReadView()
    const track = await findByIdForReader({ db }, trackId, view, access)
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
