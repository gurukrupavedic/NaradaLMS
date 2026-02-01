import { Router, Request, Response, NextFunction } from "express";
import passport from "passport";
import { identityService } from "../modules/identity-access/service";
import { authMiddleware, requireAdmin } from "../shared/middleware/auth";
import { jwtAuth } from "../middleware/jwt-auth.middleware";
import { generateToken, type JWTPayload } from "../auth/jwt.utils";
import rateLimit from "express-rate-limit";
import { validateRequest } from "../utils/validation";
import { z } from "zod";
import { config } from "../config";

// S-06: Rate limiting for auth endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // Limit each IP to 10 requests per windowMs
  message: "Too many login attempts, please try again later",
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * Identity & Access Routes
 * Handles user authentication, registration, and account management
 */
export const identityRouter = Router();

// ======================
// Public Routes
// ======================

const registerSchema = z.object({
  body: z.object({
    email: z.string().email(),
    password: z.string().min(8),
    firstName: z.string().optional(),
    lastName: z.string().optional(),
  }),
});

/**
 * POST /api/auth/register
 * Register a new user (pending approval unless admin email)
 */
identityRouter.post(
  "/register",
  authLimiter,
  validateRequest(registerSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { email, password, firstName, lastName } = req.body;

      // Note: Manual check removed as Zod handles it

      const result = await identityService.registerUser({
        email,
        password,
        firstName,
        lastName,
        adminEmail: config.adminEmail,
      });

      return res.json(result);
    } catch (err: any) {
      console.error("Register error:", err);
      return res
        .status(400)
        .json({ error: err.message || "Registration failed" });
    }
  }
);

/**
 * POST /api/auth/login
 * Local authentication (email + password)
 */
identityRouter.post(
  "/login",
  authLimiter,
  (req: Request, res: Response, next: NextFunction) => {
    passport.authenticate("local", { session: false }, (err: any, user: any, info: any) => {
      if (err) {
        return next(err);
      }
      if (!user) {
        return res.status(401).json({ error: info?.message || "Invalid credentials" });
      }

      // Generate token
      const token = generateToken({
        id: user.id || user._id,
        email: user.email,
        roles: user.roles || [],
        status: user.status || 'active',
      });

      return res.json({
        token,
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          roles: user.roles,
          status: user.status
        }
      });
    })(req, res, next);
  }
);

/**
 * GET /api/auth/google
 * Initiate Google OAuth flow
 */
identityRouter.get(
  "/google",
  passport.authenticate("google", { session: false, scope: ["profile", "email"] })
);

/**
 * GET /api/auth/google/callback
 * Google OAuth callback
 */
identityRouter.get(
  "/google/callback",
  passport.authenticate("google", { session: false, failureRedirect: "/login?error=auth_failed" }),
  (req: Request, res: Response) => {
    if (!req.user) {
      return res.redirect("/login?error=pending_approval");
    }

    const user = req.user as any;

    const token = generateToken({
      id: user.id,
      email: user.email,
      roles: user.roles || [],
      status: user.status || 'active',
    });

    // Redirect to frontend with token
    const frontendUrl = config.frontendUrl;
    return res.redirect(`${frontendUrl}?token=${token}`);
  }
);

/**
 * POST /api/auth/logout
 * Logout current user
 */
identityRouter.post("/logout", (req: Request, res: Response) => {
  // In stateless JWT, logout is primarily handled by the client (deleting the token).
  // We can just return success here.
  res.json({ message: "Logged out" });
});

/**
 * GET /api/auth/me
 * Get current authenticated user
 */
identityRouter.get("/me", jwtAuth, (req: Request, res: Response) => {
  if (!req.user) {
    return res.status(401).json({ error: "Not authenticated" });
  }
  return res.json({ user: req.user });
});

// ======================
// Admin Routes
// ======================

/**
 * GET /api/auth/admin/users
 * Get all users (pending + active) with pagination and filtering
 * Query params: limit, offset, status (optional)
 * Requires: Admin role
 */
identityRouter.get(
  "/admin/users",
  jwtAuth,
  requireAdmin,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const limit = req.query.limit ? Math.min(parseInt(req.query.limit as string), 100) : 50;
      const offset = req.query.offset ? parseInt(req.query.offset as string) : 0;
      const statusFilter = req.query.status as string | undefined;

      const allUsers = await identityService.getAllUsers();

      // Filter by status if provided
      let filteredUsers = allUsers;
      if (statusFilter && ["pending_approval", "active", "inactive"].includes(statusFilter)) {
        filteredUsers = allUsers.filter((u: any) => u.status === statusFilter);
      }

      const total = filteredUsers.length;
      const paginatedUsers = filteredUsers.slice(offset, offset + limit);

      const sanitized = paginatedUsers.map((u: any) => ({
        id: u.id,
        email: u.email,
        status: u.status,
        roles: u.roles || [],
        firstName: u.firstName,
        lastName: u.lastName,
        createdAt: u.createdAt,
      }));

      return res.json({ users: sanitized, pagination: { limit, offset, total } });
    } catch (err: any) {
      console.error("Get users error:", err);
      return res
        .status(500)
        .json({ error: err.message || "Failed to fetch users" });
    }
  }
);

/**
 * POST /api/auth/admin/users/:userId/approve
 * Approve a pending user and add student role
 * Requires: Admin role
 */
identityRouter.post(
  "/admin/users/:userId/approve",
  jwtAuth,
  requireAdmin,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { userId } = req.params;
      const user = req.user as any;

      const approvedUser = await identityService.approveUser(userId, user.id);

      return res.json({
        message: "User approved",
        user: approvedUser,
      });
    } catch (err: any) {
      console.error("Approve user error:", err);
      return res
        .status(err.message === "User not found" ? 404 : 500)
        .json({ error: err.message || "Failed to approve user" });
    }
  }
);

/**
 * POST /api/auth/admin/users/:userId/roles
 * Assign roles to a user
 * Requires: Admin role
 * Body: { roles: ['student', 'instructor', ...] }
 */
identityRouter.post(
  "/admin/users/:userId/roles",
  jwtAuth,
  requireAdmin,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { userId } = req.params;
      const { roles } = req.body;
      const user = req.user as any;

      if (!Array.isArray(roles)) {
        return res.status(400).json({ error: "Roles must be an array" });
      }

      const updatedUser = await identityService.assignRoles(
        userId,
        roles,
        user.id
      );

      return res.json({
        message: "Roles assigned",
        user: updatedUser,
      });
    } catch (err: any) {
      console.error("Assign roles error:", err);
      return res
        .status(err.message === "User not found" ? 404 : 500)
        .json({ error: err.message || "Failed to assign roles" });
    }
  }
);

/**
 * POST /api/auth/admin/users/:userId/disable
 * Disable a user account (set status to inactive)
 * Requires: Admin role
 */
identityRouter.post(
  "/admin/users/:userId/disable",
  jwtAuth,
  requireAdmin,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { userId } = req.params;

      const disabledUser = await identityService.disableUser(userId);

      return res.json({
        message: "User disabled",
        user: {
          id: disabledUser.id,
          email: disabledUser.email,
          status: disabledUser.status,
        },
      });
    } catch (err: any) {
      console.error("Disable user error:", err);
      return res
        .status(err.message === "User not found" ? 404 : 500)
        .json({ error: err.message || "Failed to disable user" });
    }
  }
);

/**
 * POST /api/auth/admin/users/:userId/enable
 * Enable a user account (set status to active)
 * Requires: Admin role
 */
identityRouter.post(
  "/admin/users/:userId/enable",
  jwtAuth,
  requireAdmin,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { userId } = req.params;

      const enabledUser = await identityService.enableUser(userId);

      return res.json({
        message: "User enabled",
        user: {
          id: enabledUser.id,
          email: enabledUser.email,
          status: enabledUser.status,
        },
      });
    } catch (err: any) {
      console.error("Enable user error:", err);
      return res
        .status(err.message === "User not found" ? 404 : 500)
        .json({ error: err.message || "Failed to enable user" });
    }
  }
);

/**
 * POST /api/auth/admin/users/:userId/reject
 * Reject a pending user (delete from database)
 * Requires: Admin role
 */
identityRouter.post(
  "/admin/users/:userId/reject",
  jwtAuth,
  requireAdmin,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { userId } = req.params;
      const result = await identityService.rejectUser(userId);
      return res.json({ success: true, message: "User rejected", user: result });
    } catch (err: any) {
      console.error("Reject user error:", err);
      return res
        .status(err.message === "User not found" ? 404 : 500)
        .json({ error: err.message || "Failed to reject user" });
    }
  }
);

/**
 * GET /api/auth/admin/users/:userId
 * Get details of a specific user
 * Requires: Admin role
 */
identityRouter.get(
  "/admin/users/:userId",
  jwtAuth,
  requireAdmin,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { userId } = req.params;
      const user = await identityService.getUser(userId);

      return res.json({
        id: user.id,
        email: user.email,
        status: user.status,
        roles: user.roles || [],
        firstName: user.firstName,
        lastName: user.lastName,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      });
    } catch (err: any) {
      console.error("Get user error:", err);
      return res
        .status(err.message === "User not found" ? 404 : 500)
        .json({ error: err.message || "Failed to fetch user" });
    }
  }
);

export default identityRouter;
