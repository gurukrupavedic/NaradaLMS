import { NextFunction, Request, Response } from "express";
import {
  authMiddleware,
  requireRole,
  requireAdmin,
  requireInstructor,
  requireContentManager,
} from "./auth";

// Re-export auth helpers
export { authMiddleware, requireRole, requireAdmin, requireInstructor, requireContentManager };

/**
 * Validate Request Middleware - Placeholder
 * Will validate request body/params against Zod schema in later phases.
 */
export const validateRequest = (schema: any) => {
  return (req: Request, res: Response, next: NextFunction) => {
    // TODO: Implement when validation schemas are in place
    next();
  };
};

/**
 * Error Handler Middleware - Placeholder
 * Will catch and format errors consistently in later phases.
 */
export const errorHandler = (
  err: any,
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  console.error("Error:", err);
  res.status(500).json({ error: "Internal server error" });
};
