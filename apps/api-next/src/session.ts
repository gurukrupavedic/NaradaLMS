import { auth } from '@narada/auth'
import { fromNodeHeaders } from 'better-auth/node'
import type { Request } from 'express'

import { forbidden, unauthorized } from './error'

export type AuthenticatedSession = typeof auth.$Infer.Session

export class User {
  public constructor(
    private readonly _id: string,
    private readonly _name: string,
    private readonly _email: string,
    private readonly _emailVerified: boolean,
    private readonly _isSuperAdmin: boolean,
    private readonly _createdAt: Date,
    private readonly _updatedAt: Date,
    private readonly _image?: string | null | undefined,
  ) {}

  get id(): string {
    return this._id
  }

  get name(): string {
    return this._name
  }

  get email(): string {
    return this._email
  }

  get emailVerified(): boolean {
    return this._emailVerified
  }

  get isSuperAdmin(): boolean {
    return this._isSuperAdmin
  }

  get createdAt(): Date {
    return this._createdAt
  }

  get updatedAt(): Date {
    return this._updatedAt
  }

  get image(): string | null | undefined {
    return this._image
  }
}

/**
 * The one authorization check that has no school context to hang off `AccessPolicy` (which
 * always requires a resolved school) — schools admin (`GET`/`PATCH /schools`) is deliberately
 * mounted on `authRoute`, before any school is selected, so this is a standalone helper rather
 * than a new `AccessPolicy` method.
 */
export function requireSuperAdmin(user: User): void {
  if (!user.isSuperAdmin) {
    throw forbidden()
  }
}

export class SessionService {
  private static readonly sessionCache = new WeakMap<Request, Promise<AuthenticatedSession>>()

  public static async getSession(req: Request): Promise<AuthenticatedSession> {
    const cached = this.sessionCache.get(req)
    if (cached) {
      return cached
    }

    // Trusts BetterAuth's signed `session_data` cookie cache rather than forcing a DB lookup on
    // every request — deliberately, even though that cache is what lets a device revoked from
    // Settings' linked-devices list keep working elsewhere for a little while. Forcing an
    // authoritative check here made revocation immediate but meant every single request into this
    // app, including read-only ones, paid a DB round trip for it; `packages/auth/src/index.ts`
    // keeps `cookieCache.maxAge` short (10s) instead, which bounds that residual-access window to
    // about the same length without giving up the cache for ordinary traffic. Endpoints that
    // actually grant something sensitive (`packages/auth/src/plugins/device-link.ts`'s
    // `lookup`/`approve`) still force the authoritative check directly, via
    // `sensitiveSessionMiddleware`.
    const sessionPromise = auth.api
      .getSession({ headers: fromNodeHeaders(req.headers) })
      .then(session => {
        if (session === null) {
          throw unauthorized()
        }

        return session
      })

    this.sessionCache.set(req, sessionPromise)
    return sessionPromise
  }

  public static async getCurrentUser(req: Request): Promise<User> {
    const { user } = await this.getSession(req)
    return new User(
      user.id,
      user.name,
      user.email,
      user.emailVerified,
      user.isSuperAdmin,
      user.createdAt,
      user.updatedAt,
      user.image,
    )
  }
}
