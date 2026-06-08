import type { Request } from 'express'
import { fromNodeHeaders } from 'better-auth/node'

import { auth } from '@narada/auth'
import {
  type BatchPermissions,
  hasBatchPermission,
  type SchoolPermissions,
} from '@narada/auth/permissions'
import type { SchoolDbExecutor } from '@narada/db'
import { forbidden, unauthorized } from '../error'
import { findEnrollment, type Enrollment } from '../services/enrollment'

export type AuthenticatedSession = typeof auth.$Infer.Session

type AuthClaim = { scope: 'super' } | { scope: 'school'; permissions: SchoolPermissions }

type BatchAccessClaim = {
  schoolPermission?: SchoolPermissions
  batchPermission: BatchPermissions
}

type BatchListClaim = {
  schoolPermission: SchoolPermissions
  allBatchesPermission: SchoolPermissions
}

export type BatchAccess =
  | { kind: 'schoolWide'; userId: string }
  | { kind: 'enrolled'; userId: string }
  | { kind: 'singleBatch'; userId: string; enrollment: Enrollment }

export type BatchItemAccess = Extract<BatchAccess, { kind: 'schoolWide' | 'singleBatch' }>
export type BatchListAccess = Extract<BatchAccess, { kind: 'schoolWide' | 'enrolled' }>

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

export async function hasPermission(req: Request, claim: AuthClaim): Promise<boolean> {
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

  return false
}

async function authorizeClaim(req: Request, claim: AuthClaim): Promise<AuthenticatedSession> {
  const session = await getSession(req)
  const allowed = await hasPermission(req, claim)
  if (!allowed) {
    throw forbidden()
  }

  return session
}

export async function requireAccess<T>(
  access: T | null | undefined | Promise<T | null | undefined>,
): Promise<T> {
  const resolved = await access
  if (!resolved) {
    throw forbidden()
  }

  return resolved
}

export async function getBatchAccess(
  req: Request,
  db: SchoolDbExecutor,
  batchId: string,
  claim: BatchAccessClaim,
): Promise<BatchItemAccess | null> {
  const { user } = await getSession(req)
  if (user.isSuperAdmin) {
    return { kind: 'schoolWide', userId: user.id }
  }

  if (claim.schoolPermission) {
    const allowed = await hasPermission(req, {
      scope: 'school',
      permissions: claim.schoolPermission,
    })

    if (allowed) {
      return { kind: 'schoolWide', userId: user.id }
    }
  }

  const enrollment = await findEnrollment(db, user.id, batchId)
  if (enrollment && hasBatchPermission(enrollment.role, claim.batchPermission)) {
    return { kind: 'singleBatch', userId: user.id, enrollment }
  }

  return null
}

export async function getBatchListAccess(
  req: Request,
  db: SchoolDbExecutor,
  claim: BatchListClaim,
): Promise<BatchListAccess | null> {
  const { user } = await getSession(req)
  const canList = await hasPermission(req, {
    scope: 'school',
    permissions: claim.schoolPermission,
  })

  if (!canList) return null
  const canSeeAll = await hasPermission(req, {
    scope: 'school',
    permissions: claim.allBatchesPermission,
  })

  return canSeeAll ? { kind: 'schoolWide', userId: user.id } : { kind: 'enrolled', userId: user.id }
}

export const authorize = authorizeClaim
