import { Router } from 'express'
import * as z from 'zod'

import { optionalProfileRoute, userRoute } from '../naradaRoute'
import { parse } from '../utils/validate'
import { findAllAccessible } from '../batches/service'
import { FindBatchesSchema } from '../batches/schema'
import { CreateProfileSchema, SearchProfilesQuerySchema, UpdateProfileSchema } from './schema'
import {
  createProfile,
  deactivateByAdmin,
  deleteById,
  findByUserId,
  searchProfiles,
  updateProfile,
} from './service'

const router = Router()

router.get(
  '/',
  userRoute(async ({ res, db, school, user }) => {
    const profiles = await findByUserId({ db, school, user }, user.id)
    res.status(200).json({ data: profiles })
  }),
)

// Mounted before the `/:profileId` routes below so Express never tries to parse "search" as a
// profile UUID.
router.get(
  '/search',
  optionalProfileRoute(async ({ req, res, db, school, user, access }) => {
    access.requireCanSearchProfiles()
    const query = await parse(SearchProfilesQuerySchema, req.query)
    const profiles = await searchProfiles({ db, school, user }, query)
    res.status(200).json({ data: profiles })
  }),
)

// "View a profile's batch history" — a real capability (see the philosophy discussion in
// PARITY_PLAN.md §1.2), not just richer profile data. `withDetail`-style eager-loaded rosters per
// batch (apps/api/src's addendum §0.3) are deliberately not added here: nothing in api-next
// consumes that yet (it exists to avoid an N+1 from the dashboard, which isn't built), so there's
// no capability it would deliver today. Add it when the dashboard actually needs it.
router.get(
  '/:profileId/batches',
  optionalProfileRoute(async ({ req, res, db, access }) => {
    const { profileId } = await parse(z.object({ profileId: z.uuid() }), req.params)
    const query = await parse(FindBatchesSchema, req.query)
    const scope = await access.getProfileBatchListScope(profileId)
    const batches = await findAllAccessible({ db }, query, scope)
    res.status(200).json({ data: batches })
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
// optionalProfileRoute, not profileRoute: requireCanDeactivateProfile is purely isSchoolAdmin() —
// an admin performing an admin action on someone else's profile shouldn't need an active profile
// of their own, the same gap piece 4 fixed for batches/exams/evaluations.
router.post(
  '/:profileId/deactivate',
  optionalProfileRoute(async ({ req, res, db, school, user, access }) => {
    const { profileId } = await parse(z.object({ profileId: z.uuid() }), req.params)
    access.requireCanDeactivateProfile()
    await deactivateByAdmin({ db, school, user }, profileId)
    res.status(204).send()
  }),
)

export default router
