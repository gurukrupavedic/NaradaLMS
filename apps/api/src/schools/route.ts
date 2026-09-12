import { Router } from 'express'
import * as z from 'zod'

import { authRoute } from '../naradaRoute'
import { requireSuperAdmin } from '../session'
import { parse } from '../utils/validate'
import { UpdateSchoolSchema } from './schema'
import { findAllSchools, updateSchool } from './service'

const router = Router()

router.get(
  '/',
  authRoute(async ({ res, db, user }) => {
    requireSuperAdmin(user)
    const schools = await findAllSchools({ db })
    res.status(200).json({ data: schools })
  }),
)

router.patch(
  '/:schoolId',
  authRoute(async ({ req, res, db, user }) => {
    requireSuperAdmin(user)
    const { schoolId } = await parse(z.object({ schoolId: z.string().min(1) }), req.params)
    const data = await parse(UpdateSchoolSchema, req.body)
    const school = await updateSchool({ db }, schoolId, data)
    res.status(200).json({ data: school })
  }),
)

export default router
