import { Router } from 'express'
import * as z from 'zod'

import { optionalProfileRoute, profileRoute } from '../naradaRoute'
import { parse } from '../utils/validate'
import { ChangeRoleSchema, CreateEnrollmentSchema, MoveEnrollmentSchema, SetEnrollmentScoresSchema } from './schema'
import { changeRole, enroll, moveEnrollment, putOnBreak, removeInstructor, setScores } from './service'

// mergeParams: mounted at /batches/:batchId/members in routes.ts — this router needs the parent
// mount path's :batchId, not just its own path segments. optionalProfileRoute (not profileRoute)
// because school admins manage rosters without needing an active profile, matching
// apps/api/src/routes/enrollment.ts's schoolRoute + tryGetActorProfile.
const router = Router({ mergeParams: true })

const BatchParamsSchema = z.object({ batchId: z.uuid() })
const MemberParamsSchema = BatchParamsSchema.extend({ profileId: z.uuid() })

router.post(
  '/',
  optionalProfileRoute(async ({ req, res, db, access }) => {
    const { batchId } = await parse(BatchParamsSchema, req.params)
    access.requireCanCreateEnrollment(batchId)
    const data = await parse(CreateEnrollmentSchema, req.body)
    const enrolled = await enroll(db, batchId, data)
    res.status(201).json({ data: enrolled })
  }),
)

// A teacher taking a student off the active roster without deleting their enrollment (see
// `service.ts::putOnBreak`) — gated on the "you manage this roster" permission.
router.post(
  '/:profileId/break',
  optionalProfileRoute(async ({ req, res, db, access }) => {
    const { batchId, profileId } = await parse(MemberParamsSchema, req.params)
    access.requireCanRemoveEnrollment(batchId)
    await putOnBreak(db, batchId, profileId)
    res.status(204).send()
  }),
)

// A teacher's or TA's -1/0/1 call on a student's attendance, recitation or backlog. Gated like
// grading (`evaluation:create`: the batch's instructor and TAs, plus school admins) — it is the
// same judgement, just not tied to a chapter. Needs a profile since the writer is recorded.
router.patch(
  '/:profileId/scores',
  profileRoute(async ({ req, res, db, access, profile }) => {
    const { batchId, profileId } = await parse(MemberParamsSchema, req.params)
    access.requireCanCreateEvaluation(batchId)
    const scores = await parse(SetEnrollmentScoresSchema, req.body)
    const updated = await setScores(db, batchId, profileId, scores, profile.id)
    res.status(200).json({ data: updated })
  }),
)

// Moving a profile to a different batch touches both rosters, so it's gated on both permissions —
// an instructor for `batchId` who isn't also an instructor (or admin) for `toBatchId` can't move
// someone into a roster they don't manage, and vice versa for removing them from this one.
router.post(
  '/:profileId/move',
  optionalProfileRoute(async ({ req, res, db, access }) => {
    const { batchId, profileId } = await parse(MemberParamsSchema, req.params)
    const { toBatchId } = await parse(MoveEnrollmentSchema, req.body)
    access.requireCanRemoveEnrollment(batchId)
    access.requireCanCreateEnrollment(toBatchId)
    const moved = await moveEnrollment(db, batchId, toBatchId, profileId)
    res.status(200).json({ data: moved })
  }),
)

// Staffing a batch — promoting a student to TA, stepping a TA back down, removing a teacher — is a
// change to the batch itself, not to a roster a teacher manages, so it takes the same permission as
// editing the batch (school admin only), not `enrollment:*`.
router.patch(
  '/:profileId',
  optionalProfileRoute(async ({ req, res, db, access }) => {
    const { batchId, profileId } = await parse(MemberParamsSchema, req.params)
    access.requireCanUpdateBatch()
    const data = await parse(ChangeRoleSchema, req.body)
    const updated = await changeRole(db, batchId, profileId, data)
    res.status(200).json({ data: updated })
  }),
)

router.delete(
  '/:profileId',
  optionalProfileRoute(async ({ req, res, db, access }) => {
    const { batchId, profileId } = await parse(MemberParamsSchema, req.params)
    access.requireCanUpdateBatch()
    await removeInstructor(db, batchId, profileId)
    res.status(204).send()
  }),
)

export default router
