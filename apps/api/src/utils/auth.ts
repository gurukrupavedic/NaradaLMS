import type { Request } from 'express'
import { fromNodeHeaders } from 'better-auth/node'

import { auth } from '@narada/auth'
import {
  type BatchPermissions,
  hasBatchPermission,
  type SchoolPermissions,
} from '@narada/auth/permissions'
import { publicDb, type SchoolDbExecutor } from '@narada/db'
import { badRequest, forbidden, unauthorized } from '../error'
import {
  findEnrollment,
  hasSharedInstructorEnrollment,
  type Enrollment,
} from '../services/enrollment'

export type AuthenticatedSession = typeof auth.$Infer.Session

type AuthClaim = { scope: 'super' } | { scope: 'school'; permissions: SchoolPermissions }

type BatchAccessClaim = {
  schoolPermission?: SchoolPermissions
  batchPermission: BatchPermissions
}

type BatchListClaim = {
  allBatchesPermission: SchoolPermissions
}

export type BatchAccess =
  | { kind: 'schoolWide' }
  | { kind: 'enrolled'; profileId: string }
  | { kind: 'singleBatch'; profileId: string; enrollment: Enrollment }

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

export async function getActorProfile(req: Request, db: SchoolDbExecutor) {
  const { user } = await getSession(req)
  const profileId = req.headers['x-profile-id']
  if (!profileId || typeof profileId !== 'string') {
    throw badRequest('X-Profile-Id header is required')
  }

  const profile = await db.query.profile.findFirst({
    where: (t, { eq }) => eq(t.id, profileId),
  })

  if (!profile || profile.userId !== user.id) {
    throw forbidden()
  }

  return { user, profile }
}

export async function tryGetActorProfile(req: Request, db: SchoolDbExecutor) {
  const { user } = await getSession(req)
  const profileId = req.headers['x-profile-id']
  if (!profileId || typeof profileId !== 'string') {
    return { user, profile: null }
  }

  const profile = await db.query.profile.findFirst({
    where: (t, { eq }) => eq(t.id, profileId),
  })

  if (!profile || profile.userId !== user.id) {
    throw forbidden()
  }

  return { user, profile }
}

export async function getBatchAccess(
  req: Request,
  db: SchoolDbExecutor,
  batchId: string,
  claim: BatchAccessClaim,
  profileId?: string | null,
): Promise<BatchItemAccess | null> {
  const { user } = await getSession(req)
  if (user.isSuperAdmin) {
    return { kind: 'schoolWide' }
  }

  if (claim.schoolPermission) {
    const allowed = await hasPermission(req, {
      scope: 'school',
      permissions: claim.schoolPermission,
    })

    if (allowed) {
      return { kind: 'schoolWide' }
    }
  }

  if (!profileId) {
    return null
  }

  const enrollment = await findEnrollment(db, profileId, batchId)
  if (enrollment && hasBatchPermission(enrollment.role, claim.batchPermission)) {
    return { kind: 'singleBatch', profileId, enrollment }
  }

  return null
}

export async function getBatchListAccess(
  req: Request,
  claim: BatchListClaim,
  profileId?: string | null,
): Promise<BatchListAccess | null> {
  const { user } = await getSession(req)
  if (user.isSuperAdmin) {
    return { kind: 'schoolWide' }
  }

  const canSeeAll = await hasPermission(req, {
    scope: 'school',
    permissions: claim.allBatchesPermission,
  })

  if (canSeeAll) {
    return { kind: 'schoolWide' }
  }

  if (!profileId) {
    return null
  }

  return { kind: 'enrolled', profileId }
}

// Grants a caller access to list a *different* profile's batches: school-wide (admin/owner or
// super admin), the profile viewing its own batches, or an instructor/ta who currently or
// previously shared a batch with that profile — the "you've taught this student before, so you
// can see their full history" rule.
//
// 'schoolWide' means "see every batch in the school" ONLY for a self-lookup (matches the
// dashboard's admin-oversight behavior). Looking up a *different* profile's batches is always
// scoped to that profile's own enrollments — school-wide access there only grants PERMISSION to
// skip the shared-instructor-enrollment check, not license to ignore which profile was asked for.
// Conflating the two used to make e.g. "view this student's past batches" return every batch in
// the school for any admin/owner caller, instead of that student's actual history.
export async function getProfileBatchListAccess(
  req: Request,
  db: SchoolDbExecutor,
  targetProfileId: string,
  claim: BatchListClaim,
  actorProfileId?: string | null,
): Promise<BatchListAccess | null> {
  const { user } = await getSession(req)

  if (actorProfileId === targetProfileId) {
    if (user.isSuperAdmin) {
      return { kind: 'schoolWide' }
    }

    const canSeeAll = await hasPermission(req, {
      scope: 'school',
      permissions: claim.allBatchesPermission,
    })

    return canSeeAll ? { kind: 'schoolWide' } : { kind: 'enrolled', profileId: targetProfileId }
  }

  if (user.isSuperAdmin) {
    return { kind: 'enrolled', profileId: targetProfileId }
  }

  const canSeeAll = await hasPermission(req, {
    scope: 'school',
    permissions: claim.allBatchesPermission,
  })

  if (canSeeAll) {
    return { kind: 'enrolled', profileId: targetProfileId }
  }

  if (!actorProfileId) {
    return null
  }

  const shared = await hasSharedInstructorEnrollment(db, actorProfileId, targetProfileId)
  if (!shared) {
    return null
  }

  return { kind: 'enrolled', profileId: targetProfileId }
}

export const authorize = authorizeClaim

export async function requireOrgMember(req: Request, orgId: string): Promise<void> {
  const { user } = await getSession(req)
  if (user.isSuperAdmin) {
    return
  }

  const row = await publicDb.query.member.findFirst({
    where: (t, { and, eq }) => and(eq(t.organizationId, orgId), eq(t.userId, user.id)),
    columns: { id: true },
  })

  if (!row) {
    throw forbidden()
  }
}
