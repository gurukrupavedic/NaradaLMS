import { Router } from 'express'
import * as z from 'zod'

import { optionalProfileRoute, profileRoute } from '../naradaRoute'
import { parse } from '../utils/validate'
import { FindExamSlotRequestsSchema, FindExamSlotsSchema, OpenExamSlotSchema } from './schema'
import {
  approve,
  cancelSlot,
  findManyRequests,
  findManySlots,
  findRequestByIdWithDetail,
  findSlotByIdWithDetail,
  openSlot,
  reject,
  request,
} from './service'

const router = Router()

// A slot carries no personal data — just a track, a time and who opened it — so listing or reading
// one needs no dedicated access check beyond ordinary school membership (already enforced upstream
// by `naradaRoute`'s course/school resolution). Compare the `/requests` routes below, which do
// check, because a *request* carries a student.
router.get(
  '/',
  optionalProfileRoute(async ({ req, res, db, getCourse }) => {
    const query = await parse(FindExamSlotsSchema, req.query)
    const result = await findManySlots({ db }, query, (await getCourse()).id)
    res.status(200).json({ data: result })
  }),
)

// Registered before `/:examSlotId` below — as a literal path it must win over that single-segment
// wildcard, or a request for "the requests list" would instead be parsed as "the slot whose id is
// the literal string 'requests'" and 400 on the uuid check.
router.get(
  '/requests',
  optionalProfileRoute(async ({ req, res, db, access, getCourse }) => {
    const scope = access.getExamSlotRequestVisibility()
    const query = await parse(FindExamSlotRequestsSchema, req.query)
    const result = await findManyRequests({ db }, query, scope, (await getCourse()).id)
    res.status(200).json({ data: result })
  }),
)

router.get(
  '/:examSlotId',
  optionalProfileRoute(async ({ req, res, db }) => {
    const { examSlotId } = await parse(z.object({ examSlotId: z.uuid() }), req.params)
    const slot = await findSlotByIdWithDetail({ db }, examSlotId)
    res.status(200).json({ data: slot })
  }),
)

router.get(
  '/requests/:examSlotRequestId',
  optionalProfileRoute(async ({ req, res, db, access }) => {
    const { examSlotRequestId } = await parse(z.object({ examSlotRequestId: z.uuid() }), req.params)
    const row = await findRequestByIdWithDetail({ db }, examSlotRequestId)
    access.requireCanReadExamSlotRequest(row)
    res.status(200).json({ data: row })
  }),
)

// openSlot itself calls access.requireCanCreateExam (school-admin only) — see its doc comment.
router.post(
  '/',
  profileRoute(async ({ req, res, db, access, profile }) => {
    const data = await parse(OpenExamSlotSchema, req.body)
    const slot = await openSlot({ db, access }, data, profile.id)
    res.status(201).json({ data: slot })
  }),
)

// cancelSlot itself calls access.requireCanCreateExam (school-admin only) — see its doc comment.
router.post(
  '/:examSlotId/cancel',
  optionalProfileRoute(async ({ req, res, db, access, profile }) => {
    const { examSlotId } = await parse(z.object({ examSlotId: z.uuid() }), req.params)
    const slot = await cancelSlot({ db, access }, examSlotId, profile?.id ?? null)
    res.status(200).json({ data: slot })
  }),
)

// A student claiming a slot for themselves — `profileRoute`, not `optionalProfileRoute`: there's
// no meaningful "request a sitting" with no self to sit it, same reasoning as
// `batches/route.ts`'s own POST /:batchId/enroll. No access check here: eligibility (L3 across the
// track) is the service's own gate, not a permission — any active profile may attempt it.
router.post(
  '/:examSlotId/requests',
  profileRoute(async ({ req, res, db, profile }) => {
    const { examSlotId } = await parse(z.object({ examSlotId: z.uuid() }), req.params)
    const row = await request({ db }, examSlotId, profile.id)
    res.status(201).json({ data: row })
  }),
)

// approve/reject themselves call access.requireCanCreateExam (school-admin only) — see their doc
// comments in service.ts.
function reviewHandler(action: typeof approve | typeof reject) {
  return optionalProfileRoute(async ({ req, res, db, access, profile }) => {
    const { examSlotRequestId } = await parse(z.object({ examSlotRequestId: z.uuid() }), req.params)
    const row = await action({ db, access }, examSlotRequestId, profile?.id ?? null)
    res.status(200).json({ data: row })
  })
}

router.post('/requests/:examSlotRequestId/approve', reviewHandler(approve))
router.post('/requests/:examSlotRequestId/reject', reviewHandler(reject))

export default router
