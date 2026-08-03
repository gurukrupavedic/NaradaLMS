import { Router } from 'express'
import * as z from 'zod'

import { profileRoute, userRoute } from '../naradaRoute'
import { parse } from '../utils/validate'
import { CreateProfileSchema, UpdateProfileSchema } from './schema'
import { createProfile, deactivateByAdmin, deleteById, findByUserId, updateProfile } from './service'

const router = Router()

router.get(
  '/',
  userRoute(async ({ res, db, school, user }) => {
    const profiles = await findByUserId({ db, school, user }, user.id)
    res.status(200).json({ data: profiles })
  }),
)

router.post(
  '/',
  userRoute(async ({ req, res, db, school, user }) => {
    const data = await parse(CreateProfileSchema, req.body)
    const profile = await createProfile({ db, school, user }, data)
    res.status(201).json({ data: profile })
  }),
)

router.patch(
  '/:profileId',
  userRoute(async ({ req, res, db, school, user }) => {
    const { profileId } = await parse(z.object({ profileId: z.uuid() }), req.params)
    const data = await parse(UpdateProfileSchema, req.body)
    const profile = await updateProfile({ db, school, user }, profileId, data)
    res.status(200).json({ data: profile })
  }),
)

router.delete(
  '/:profileId',
  userRoute(async ({ req, res, db, school, user }) => {
    const { profileId } = await parse(z.object({ profileId: z.uuid() }), req.params)
    await deleteById({ db, school, user }, profileId)
    res.status(204).send()
  }),
)

// Admin-deactivation (DD-011 §9): a separate route from the owner-only DELETE above, since the
// authorization check (school admin acting on someone else's profile) is a different question
// from "does the caller own this profile" and shouldn't be conflated behind one path.
router.post(
  '/:profileId/deactivate',
  profileRoute(async ({ req, res, db, school, user, access }) => {
    const { profileId } = await parse(z.object({ profileId: z.uuid() }), req.params)
    access.requireCanDeactivateProfile()
    await deactivateByAdmin({ db, school, user }, profileId)
    res.status(204).send()
  }),
)

export default router
