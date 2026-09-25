import { Router } from 'express'
import * as z from 'zod'

import { optionalProfileRoute, userRoute } from '../naradaRoute'
import { parse } from '../utils/validate'
import { findAllAccessible, findAllAccessibleWithDetail } from '../batches/service'
import { find as findCourseProfile } from '../courseProfile/repository'
import { EMPTY_COURSE_PROFILE } from '../courseProfile/schema'
import { getDashboardData } from '../dashboard/service'
import { ProfileBatchesQuerySchema, SearchProfilesQuerySchema, UpdateProfileSchema } from './schema'
import { deleteProfile, findById, findByUserId, searchProfiles, updateProfile } from './service'

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

// "View a profile's batch history" — a real capability, not just richer profile data. `withDetail=true` eager-loads each batch's
// roster/schedule/the target's own role in the same query — added once a real consumer showed up
// (apps/web's admin overview, scoped while migrating apps/web onto this contract): without it,
// showing "every batch in the school with its roster" would cost one request per batch, the same
// fan-out shape that already exhausted the DB pool once.
router.get(
  '/:profileId/batches',
  optionalProfileRoute(async ({ req, res, db, access, getCourse }) => {
    const { profileId } = await parse(z.object({ profileId: z.uuid() }), req.params)
    const query = await parse(ProfileBatchesQuerySchema, req.query)
    const scope = await access.getProfileBatchListScope(profileId)
    const courseId = (await getCourse()).id
    const batches = query.withDetail
      ? await findAllAccessibleWithDetail({ db }, query, scope, profileId, courseId)
      : await findAllAccessible({ db }, query, scope, courseId)
    res.status(200).json({ data: batches })
  }),
)

// The profile page's data: full contact/background detail plus the same track/exam-history shape
// the dashboard already assembles for "self" — `getDashboardData` was already fully parametrized
// by profileId, so this is the same aggregation for any profile the caller is allowed to view.
router.get(
  '/:profileId/detail',
  optionalProfileRoute(async ({ req, res, db, school, user, access, getCourse }) => {
    const { profileId } = await parse(z.object({ profileId: z.uuid() }), req.params)
    await access.requireCanViewProfile(profileId)
    const profile = await findById({ db, school, user }, profileId)
    const course = await getCourse()
    // The dashboard carries the course's track catalogue, so the *caller* (not just the profile
    // being viewed) has to be part of the course the request names.
    await access.requireCanReadCourseContent(course.id)
    const dashboard = await getDashboardData({ db }, profile.id, profile.name, course.id)
    // What this person has in *this* course (the course-level component); empty until something is
    // written there — a student an admin put on a roster has no row yet.
    const courseProfile =
      (await findCourseProfile(db, profile.id, course.id)) ?? EMPTY_COURSE_PROFILE
    res.status(200).json({ data: { profile, courseProfile, dashboard } })
  }),
)

// One route for both the owner's self-edit and a school admin correcting someone else's profile
// — `service.ts::updateProfile` branches on `access.isSchoolAdmin()` itself, so there's exactly
// one authorization story to get right rather than two routes that each have to. optionalProfileRoute,
// not userRoute: an admin correcting another student's details shouldn't need an active profile of
// their own (the same gap piece 4 fixed for batches/exams/evaluations); self-edit doesn't need one
// either, since ownership is keyed on `user.id`, not the active profile.
router.patch(
  '/:profileId',
  optionalProfileRoute(async ({ req, res, db, school, user, access }) => {
    const { profileId } = await parse(z.object({ profileId: z.uuid() }), req.params)
    const data = await parse(UpdateProfileSchema, req.body)
    const profile = await updateProfile({ db, school, user, access }, profileId, data)
    res.status(200).json({ data: profile })
  }),
)

// Same split as the PATCH above, in one route: `service.ts::deleteProfile` deactivates the
// caller's own profile, or (school admin) anyone else's.
router.delete(
  '/:profileId',
  optionalProfileRoute(async ({ req, res, db, school, user, access }) => {
    const { profileId } = await parse(z.object({ profileId: z.uuid() }), req.params)
    await deleteProfile({ db, school, user, access }, profileId)
    res.status(204).send()
  }),
)

export default router
