import { auth } from '@narada/auth'
import { fromNodeHeaders } from 'better-auth/node'
import type { Request } from 'express'

import { unauthorized } from './error'

export type AuthenticatedSession = typeof auth.$Infer.Session

export type User = AuthenticatedSession['user']

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
    return user
  }
}
