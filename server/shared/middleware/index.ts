import {
  authMiddleware,
  requireRole,
  requireAdmin,
  requireInstructor,
} from "./auth";

// Re-export auth helpers
export { authMiddleware, requireRole, requireAdmin, requireInstructor };
