import { Request, Response, NextFunction } from 'express'

import AuthClient from '../utils/auth'

export async function resolveAuth(req: Request, res: Response, next: NextFunction) {
  const authClient = new AuthClient(req, res.locals.db)
  res.locals.authClient = authClient
  next()
}
