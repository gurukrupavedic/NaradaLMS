import { Router } from 'express'
import * as z from 'zod'

import { request as requestEnrollment } from '../enrollmentRequests/service'
import { optionalProfileRoute, profileRoute } from '../naradaRoute'
import { parse } from '../utils/validate'
import { CreateBatchSchema, FindBatchesSchema, SetClassSlotsSchema, UpdateBatchSchema } from './schema'
import {
  createBatch,
  findAllAccessible,
  findByIdWithMembers,
  findOpenBatches,
  setClassSlots,
  updateBatch,
} from './service'

const router = Router()

router.get(
  '/',
  optionalProfileRoute(async ({ req, res, db, access, getCourse }) => {
    const query = await parse(FindBatchesSchema, req.query)
    const visibility = await access.getBatchVisibility()
    const batches = await findAllAccessible({ db }, query, visibility, (await getCourse()).id)
    res.status(200).json({ data: batches })
  }),
)

// Mounted before `/:batchId` below so Express never tries to parse "open" as a batch UUID — same
// reasoning as profiles/route.ts's `/search`. Any signed-in profile, not gated by a batch
// permission: "which batches can I join" is a different question from "which batches am I
// already in or administer" (access.getBatchVisibility) — every batch not yet marked completed
// is requestable, no school role required to see the list.
router.get(
  '/open',
  profileRoute(async ({ res, db, getCourse }) => {
    const batches = await findOpenBatches({ db }, (await getCourse()).id)
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

// The student's own counterpart to admin enrollment (POST /batches/:batchId/members, in
// ../enrollment/route.ts) — files a pending request to join as a student rather than seating them
// directly; an admin/instructor must approve it (../enrollmentRequests/route.ts) first. Any batch
// not yet marked completed can be requested — no batch permission gates this, only the
// enrollmentRequests service's own not-completed/not-already-enrolled/not-already-pending checks.
// `profileRoute`, not `optionalProfileRoute`: there is no meaningful "request to join" with no self
// to enroll.
router.post(
  '/:batchId/enroll',
  profileRoute(async ({ req, res, db, profile }) => {
    const { batchId } = await parse(z.object({ batchId: z.uuid() }), req.params)
    const row = await requestEnrollment(db, batchId, profile.id)
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
