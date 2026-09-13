import { Router } from 'express'
import * as z from 'zod'

import { selfEnroll } from '../enrollment/service'
import { optionalProfileRoute, profileRoute } from '../naradaRoute'
import { parse } from '../utils/validate'
import { CreateBatchSchema, FindBatchesSchema, SetClassSlotsSchema, UpdateBatchSchema } from './schema'
import {
  closeEnrollment,
  createBatch,
  findAllAccessible,
  findByIdWithMembers,
  findOpenBatches,
  openEnrollment,
  setClassSlots,
  updateBatch,
} from './service'

const router = Router()

router.get(
  '/',
  optionalProfileRoute(async ({ req, res, db, access }) => {
    const query = await parse(FindBatchesSchema, req.query)
    const visibility = await access.getBatchVisibility()
    const batches = await findAllAccessible({ db }, query, visibility)
    res.status(200).json({ data: batches })
  }),
)

// Mounted before `/:batchId` below so Express never tries to parse "open" as a batch UUID — same
// reasoning as profiles/route.ts's `/search`. Any signed-in profile, not gated by a batch
// permission: "which batches can I join" is a different question from "which batches am I
// already in or administer" (access.getBatchVisibility), and every batch's own open-enrollment
// window is the real gate here, not a school role.
router.get(
  '/open',
  profileRoute(async ({ res, db }) => {
    const batches = await findOpenBatches({ db })
    res.status(200).json({ data: batches })
  }),
)

router.get(
  '/:batchId',
  optionalProfileRoute(async ({ req, res, db, access }) => {
    const { batchId } = await parse(z.object({ batchId: z.uuid() }), req.params)
    await access.requireCanReadBatch(batchId)
    const batch = await findByIdWithMembers({ db }, batchId)
    res.status(200).json({ data: batch })
  }),
)

router.post(
  '/',
  optionalProfileRoute(async ({ req, res, db, access }) => {
    await access.requireCanCreateBatch()
    const data = await parse(CreateBatchSchema, req.body)
    const batch = await createBatch({ db }, data)
    res.status(201).json({ data: batch })
  }),
)

router.patch(
  '/:batchId',
  optionalProfileRoute(async ({ req, res, db, access }) => {
    const { batchId } = await parse(z.object({ batchId: z.uuid() }), req.params)
    await access.requireCanUpdateBatch(batchId)
    const data = await parse(UpdateBatchSchema, req.body)
    const batch = await updateBatch({ db }, batchId, data)
    res.status(200).json({ data: batch })
  }),
)

// The admin "just open/close it" actions — a one-click alternative to `PATCH /:batchId` that
// spares an admin from having to compute an opens-at/closes-at timestamp pair by hand (see
// `batches/service.ts::openEnrollment`/`closeEnrollment`, and the enrollment columns' own doc
// comment in packages/db/src/schema/school.ts). Same authorization as any other batch edit.
router.post(
  '/:batchId/enrollment/open',
  optionalProfileRoute(async ({ req, res, db, access }) => {
    const { batchId } = await parse(z.object({ batchId: z.uuid() }), req.params)
    await access.requireCanUpdateBatch(batchId)
    const batch = await openEnrollment({ db }, batchId)
    res.status(200).json({ data: batch })
  }),
)

router.post(
  '/:batchId/enrollment/close',
  optionalProfileRoute(async ({ req, res, db, access }) => {
    const { batchId } = await parse(z.object({ batchId: z.uuid() }), req.params)
    await access.requireCanUpdateBatch(batchId)
    const batch = await closeEnrollment({ db }, batchId)
    res.status(200).json({ data: batch })
  }),
)

// The student's own counterpart to admin enrollment (POST /batches/:batchId/members, in
// ../enrollment/route.ts) — always enrolls the caller's own active profile as a student, gated by
// the batch's own open-enrollment window rather than a batch permission. `profileRoute`, not
// `optionalProfileRoute`: there is no meaningful "enroll myself" with no self to enroll.
router.post(
  '/:batchId/enroll',
  profileRoute(async ({ req, res, db, profile }) => {
    const { batchId } = await parse(z.object({ batchId: z.uuid() }), req.params)
    const row = await selfEnroll(db, batchId, profile.id)
    res.status(201).json({ data: row })
  }),
)

router.put(
  '/:batchId/schedule',
  optionalProfileRoute(async ({ req, res, db, access }) => {
    const { batchId } = await parse(z.object({ batchId: z.uuid() }), req.params)
    await access.requireCanUpdateBatch(batchId)
    const data = await parse(SetClassSlotsSchema, req.body)
    const classSlots = await setClassSlots({ db }, batchId, data)
    res.status(200).json({ data: classSlots })
  }),
)

export default router
