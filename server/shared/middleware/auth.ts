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
 * Role guard using the roles array attached to req.user by Passport.
 * Fails with 401 when no user; 403 when none of the required roles are present.
 */
export const requireRole = (...roles: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const user = req.user as Express.User | undefined;
    if (!user) {
      return res.status(401).json({ error: "Unauthorized - missing or invalid token" });
    }

    const userRoles = user.roles ?? [];
    const allowed = roles.length === 0 || roles.some((role) => userRoles.includes(role));

    if (!allowed) {
      return res.status(403).json({ error: "Insufficient permissions" });
    }

    next();
  };
};

// Role hierarchy: admin has access to everything (including content management)
export const requireAdmin = requireRole("admin");
export const requireInstructor = requireRole("instructor", "admin");
