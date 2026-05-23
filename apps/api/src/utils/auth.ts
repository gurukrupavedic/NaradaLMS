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

export default class AuthClient {
  private request: Request
  private db: Database
  private session?: AuthenticatedSession

  constructor(request: Request, db: Database) {
    this.request = request
    this.db = db
  }

  private get requestHeaders() {
    return fromNodeHeaders(this.request.headers)
  }

  public async getSession(): Promise<AuthenticatedSession> {
    if (this.session) {
      return this.session
    }

    const session = await auth.api.getSession({ headers: this.requestHeaders })
    if (session === null) {
      throw unauthorized()
    }

    this.session = session
    return session
  }

  public async hasSchoolPermissions(required: SchoolPermissions): Promise<boolean> {
    const { user } = await this.getSession()
    if (user.isSuperAdmin) {
      return true
    }

    const { success } = await auth.api.hasPermission({
      headers: this.requestHeaders,
      body: { permissions: required },
    })

    return success
  }

  public async ensureSchoolPermissions(required: SchoolPermissions): Promise<void> {
    const allowed = await this.hasSchoolPermissions(required)
    if (!allowed) {
      throw forbidden()
    }
  }

  public async ensureBatchPermissions(required: BatchPermissions, batchId: string): Promise<void> {
    const { user } = await this.getSession()
    if (user.isSuperAdmin) {
      return
    }

    const enrollment = await EnrollmentService.findOne(this.db, user.id, batchId)
    if (!enrollment || !hasBatchPermission(enrollment.role, required)) {
      throw forbidden()
    }
  }
}
