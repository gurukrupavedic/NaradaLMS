import { auth } from '@narada/auth'
import { fromNodeHeaders } from 'better-auth/node'
import type { Request } from 'express'

import { unauthorized } from './error'

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

export class SessionService {
  private static readonly sessionCache = new WeakMap<Request, Promise<AuthenticatedSession>>()

  public static async getSession(req: Request): Promise<AuthenticatedSession> {
    const cached = this.sessionCache.get(req)
    if (cached) {
      return cached
    }

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
