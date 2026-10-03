import { Router } from 'express'
import * as z from 'zod'

import { optionalProfileRoute } from '../naradaRoute'
import { parse } from '../utils/validate'
import { AddTrackTaSchema } from './schema'
import { add, findAll, findCandidates, remove } from './service'

const router = Router()

// Every listed TA in the course, all tracks — what a student reads to find someone to approach for
// an L3. Course members only, same gate as the track list itself.
router.get(
  '/',
  optionalProfileRoute(async ({ res, db, access, getCourse }) => {
    const course = await getCourse()
    await access.requireCanReadCourseContent(course.id)
    res.status(200).json({ data: await findAll({ db }, course.id) })
  }),
)

// The admin picker: who could be added to this track's list right now. `/candidates/:trackId`
// rather than a query param so it can never be mistaken for the list above.
router.get(
  '/candidates/:trackId',
  optionalProfileRoute(async ({ req, res, db, access, getCourse }) => {
    const { trackId } = await parse(z.object({ trackId: z.uuid() }), req.params)
    const data = await findCandidates({ db, access }, trackId, (await getCourse()).id)
    res.status(200).json({ data })
  }),
)

router.post(
  '/',
  optionalProfileRoute(async ({ req, res, db, access, getCourse }) => {
    const data = await parse(AddTrackTaSchema, req.body)
    const row = await add({ db, access }, data, (await getCourse()).id)
    res.status(201).json({ data: row })
  }),
)

router.delete(
  '/:trackId/:profileId',
  optionalProfileRoute(async ({ req, res, db, access, getCourse }) => {
    const { trackId, profileId } = await parse(
      z.object({ trackId: z.uuid(), profileId: z.uuid() }),
      req.params,
    )
    await remove({ db, access }, trackId, profileId, (await getCourse()).id)
    res.status(204).send()
  }),
)

export default router
