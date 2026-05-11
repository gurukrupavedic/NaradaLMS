import { NextFunction, Request, Response } from "express";

/**
 * Authentication guard using the req.user populated by jwtAuth middleware.
 * Fails with 401 if no authenticated user is present.
 */
export const authMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const user = req.user as Express.User | undefined;
  if (!user) {
    return res.status(401).json({ error: "Unauthorized - missing or invalid token" });
  }
  next();
};

/**
 * Role guard using org-scoped roles on `req.user` (JWT `orgRoles`), populated by jwt-auth.
 * Super-admin bypasses org role checks for this guard.
 */
export const requireRole = (...roles: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const user = req.user as Express.User | undefined;
    if (!user) {
      return res.status(401).json({ error: "Unauthorized - missing or invalid token" });
    }

    if (user.isSuperAdmin) {
      return next();
    }

    const userRoles = user.orgRoles ?? [];
    const allowed =
      roles.length === 0 ||
      roles.some((role) => userRoles.includes(role));

    if (!allowed) {
      return res.status(403).json({ error: "Insufficient permissions" });
    }

    next();
  };
};

/**
 * Platform governance: only users with `isSuperAdmin` on the JWT may proceed.
 */
export const requireSuperAdmin = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const user = req.user as Express.User | undefined;
  if (!user) {
    return res.status(401).json({ error: "Unauthorized - missing or invalid token" });
  }
  if (!user.isSuperAdmin) {
    return res.status(403).json({ error: "Super-admin access required" });
  }
  next();
};

// Role hierarchy: admin has access to everything (including content management)
export const requireAdmin = requireRole("admin");
export const requireInstructor = requireRole("instructor", "admin");
