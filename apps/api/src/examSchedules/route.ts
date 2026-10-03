import { Router } from 'express'
import * as z from 'zod'

import { profileRoute } from '../naradaRoute'
import { parse } from '../utils/validate'
import { ExamScheduleDataSchema } from './schema'
import { create, findAll, remove, update } from './service'

const router = Router()

const idParams = z.object({ examScheduleId: z.uuid() })

// Every handler is admin-only: the service calls `access.requireCanCreateExam` itself (the same
// gate as opening a slot by hand — see `examSlots/service.ts::openSlot`).
router.get(
  '/',
  profileRoute(async ({ res, db, access, getCourse }) => {
    const rows = await findAll({ db, access }, (await getCourse()).id)
    res.status(200).json({ data: rows })
  }),
)

router.post(
  '/',
  profileRoute(async ({ req, res, db, access, profile, getCourse }) => {
    const data = await parse(ExamScheduleDataSchema, req.body)
    const row = await create({ db, access }, data, profile.id, (await getCourse()).id)
    res.status(201).json({ data: row })
  }),
)

router.put(
  '/:examScheduleId',
  profileRoute(async ({ req, res, db, access, getCourse }) => {
    const { examScheduleId } = await parse(idParams, req.params)
    const data = await parse(ExamScheduleDataSchema, req.body)
    const result = await update({ db, access }, examScheduleId, data, (await getCourse()).id)
    res.status(200).json({ data: result })
  }),
)

router.delete(
  '/:examScheduleId',
  profileRoute(async ({ req, res, db, access, getCourse }) => {
    const { examScheduleId } = await parse(idParams, req.params)
    await remove({ db, access }, examScheduleId, (await getCourse()).id)
    res.status(204).end()
  }),
)

export default router
