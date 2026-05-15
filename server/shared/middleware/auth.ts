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
 * Org role guard using `req.user.orgRoles` (JWT, scoped to current org).
 * Does **not** treat `isSuperAdmin` as satisfying org roles (§3.4 policy A).
 */
export const requireOrgRoleStrict = (...roles: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const user = req.user as Express.User | undefined;
    if (!user) {
      return res.status(401).json({ error: "Unauthorized - missing or invalid token" });
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
 * Same as {@link requireOrgRoleStrict}; kept as the primary export name used across routes.
 */
export const requireOrgRole = requireOrgRoleStrict;

/**
 * Backward-compatible alias for org-scoped role checks.
 * Prefer `requireOrgRole` in new code and docs.
 */
export const requireRole = requireOrgRole;

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
export const requireAdmin = requireOrgRoleStrict("admin");
export const requireInstructor = requireOrgRoleStrict("instructor", "admin");
