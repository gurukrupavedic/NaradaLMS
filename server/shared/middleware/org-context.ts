import { NextFunction, Request, Response } from "express";
import "../types";

/**
 * Copies JWT `currentOrgId` onto `req.orgId` for handlers and future org-scoped guards.
 * Run after `jwtAuth` (or when `req.user` is otherwise set from a verified token).
 */
export function attachOrgContext(req: Request, _res: Response, next: NextFunction) {
  const user = req.user as Express.User | undefined;
  req.orgId = user?.currentOrgId;
  next();
}

/**
 * For routes that require an org context in the session (Layer 3+).
 */
export function requireOrgContext(req: Request, res: Response, next: NextFunction) {
  if (!req.orgId) {
    return res.status(403).json({ error: "Organization context required" });
  }
  next();
}
