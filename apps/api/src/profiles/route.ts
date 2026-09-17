import { Router } from 'express'
import * as z from 'zod'

import { optionalProfileRoute, userRoute } from '../naradaRoute'
import { parse } from '../utils/validate'
import { findAllAccessible, findAllAccessibleWithDetail } from '../batches/service'
import { getDashboardData } from '../dashboard/service'
import {
  CreateProfileSchema,
  ProfileBatchesQuerySchema,
  SearchProfilesQuerySchema,
  UpdateProfileSchema,
} from './schema'
import {
  createProfile,
  deactivateByAdmin,
  deleteById,
  findById,
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
// PARITY_PLAN.md §1.2), not just richer profile data. `withDetail=true` eager-loads each batch's
// roster/schedule/the target's own role in the same query — added once a real consumer showed up
// (apps/web's admin overview, scoped while migrating apps/web onto this contract): without it,
// showing "every batch in the school with its roster" would cost one request per batch, the same
// fan-out shape [[project_batch_n1_incident]] already broke once.
router.get(
  '/:profileId/batches',
  optionalProfileRoute(async ({ req, res, db, access }) => {
    const { profileId } = await parse(z.object({ profileId: z.uuid() }), req.params)
    const query = await parse(ProfileBatchesQuerySchema, req.query)
    const scope = await access.getProfileBatchListScope(profileId)
    const batches = query.withDetail
      ? await findAllAccessibleWithDetail({ db }, query, scope, profileId)
      : await findAllAccessible({ db }, query, scope)
    res.status(200).json({ data: batches })
  }),
)

// The profile page's data: full contact/background detail plus the same track/exam-history shape
// the dashboard already assembles for "self" — `getDashboardData` was already fully parametrized
// by profileId, so this is the same aggregation for any profile the caller is allowed to view.
router.get(
  '/:profileId/detail',
  optionalProfileRoute(async ({ req, res, db, school, user, access }) => {
    const { profileId } = await parse(z.object({ profileId: z.uuid() }), req.params)
    await access.requireCanViewProfile(profileId)
    const profile = await findById({ db, school, user }, profileId)
    const dashboard = await getDashboardData({ db }, profile.id, profile.name)
    res.status(200).json({ data: { profile, dashboard } })
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
