import { NextFunction, Request, Response } from "express";

/**
 * Authentication guard using the existing Passport session user (req.user).
 * Fails with 401 if no authenticated user is present.
 */
export const authMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const user = req.user as Express.User | undefined;
  if (!user) {
    return res.status(401).json({ error: "Unauthorized - no session" });
  }
  next();
};

/**
 * Role guard using the roles array attached to req.user by Passport.
 * Fails with 403 when none of the required roles are present.
 */
export const requireRole = (...roles: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const user = req.user as Express.User | undefined;
    const userRoles = user?.roles ?? [];
    const allowed = roles.length === 0 || roles.some((role) => userRoles.includes(role));

    if (!allowed) {
      return res.status(403).json({ error: "Insufficient permissions" });
    }

    next();
  };
};

export const requireAdmin = requireRole("admin");
export const requireInstructor = requireRole("instructor");
export const requireContentManager = requireRole("content_manager");
