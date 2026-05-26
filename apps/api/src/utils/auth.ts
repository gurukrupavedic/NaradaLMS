import type { Request } from 'express'
import { fromNodeHeaders } from 'better-auth/node'

import { auth } from '@narada/auth'
import {
  type BatchPermissions,
  hasBatchPermission,
  type SchoolPermissions,
} from '@narada/auth/permissions'
import type { Database } from '@narada/db'
import { forbidden, unauthorized } from '../error'
import EnrollmentService from '../services/enrollment'

export type AuthenticatedSession = typeof auth.$Infer.Session

type AuthClaim =
  | { scope: 'super' }
  | { scope: 'school'; permissions: SchoolPermissions }
  | { scope: 'batch'; batchId: string; permissions: BatchPermissions }

const sessions = new WeakMap<Request, Promise<AuthenticatedSession>>()

function requestHeaders(req: Request) {
  return fromNodeHeaders(req.headers)
}

export async function getSession(req: Request): Promise<AuthenticatedSession> {
  const cached = sessions.get(req)
  if (cached) return cached

  const sessionPromise = auth.api.getSession({ headers: requestHeaders(req) }).then(session => {
    if (session === null) {
      throw unauthorized()
    }

    return session
  })

  sessions.set(req, sessionPromise)
  return sessionPromise
}

export async function hasPermission(
  req: Request,
  db: Database,
  claim: AuthClaim,
): Promise<boolean> {
  const { user } = await getSession(req)
  if (user.isSuperAdmin) {
    return true
  }

  if (claim.scope === 'super') {
    return false
  }

  if (claim.scope === 'school') {
    const { success } = await auth.api.hasPermission({
      headers: requestHeaders(req),
      body: { permissions: claim.permissions },
    })

    return success
  }

  // TODO: use Redis to cache these reads
  const enrollment = await EnrollmentService.findOne(db, user.id, claim.batchId)
  return enrollment !== undefined && hasBatchPermission(enrollment.role, claim.permissions)
}

export async function authorize(
  req: Request,
  db: Database,
  claim: AuthClaim,
): Promise<AuthenticatedSession> {
  const session = await getSession(req)
  const allowed = await hasPermission(req, db, claim)
  if (!allowed) {
    throw forbidden()
  }

  return session
}
