import { Router } from 'express'
import * as z from 'zod'

import { userRoute } from '../naradaRoute'
import { parse } from '../utils/validate'
import { CreateProfileSchema, UpdateProfileSchema } from './schema'
import { createProfile, deleteById, findByUserId, updateProfile } from './service'

const router = Router()

router.get(
  '/',
  userRoute(async ({ res, db, user }) => {
    const profiles = await findByUserId(user.id, db)
    res.status(200).json({ data: profiles })
  }),
)

router.post(
  '/',
  userRoute(async ({ req, res, db, school, user }) => {
    const data = await parse(CreateProfileSchema, req.body)
    const profile = await createProfile(school, user, data, db)
    res.status(201).json({ data: profile })
  }),
)

router.patch(
  '/:profileId',
  userRoute(async ({ req, res, db, user }) => {
    const { profileId } = await parse(z.object({ profileId: z.uuid() }), req.params)
    const data = await parse(UpdateProfileSchema, req.body)
    const profile = await updateProfile(profileId, user.id, data, db)
    res.status(200).json({ data: profile })
  }),
)

router.delete(
  '/:profileId',
  userRoute(async ({ req, res, db, user }) => {
    const { profileId } = await parse(z.object({ profileId: z.uuid() }), req.params)
    await deleteById(profileId, user.id, db)
    res.status(204).send()
  }),
)

export default router
