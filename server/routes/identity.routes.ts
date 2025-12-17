import { Router, Request, Response, NextFunction } from "express";
import passport from "passport";
import { identityService } from "../modules/identity-access/service";
import { authMiddleware, requireAdmin } from "../shared/middleware/auth";

/**
 * Identity & Access Routes
 * Handles user authentication, registration, and account management
 */
export const identityRouter = Router();

// ======================
// Public Routes
// ======================

/**
 * POST /api/auth/register
 * Register a new user (pending approval unless admin email)
 */
identityRouter.post("/register", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, password, firstName, lastName } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required" });
    }

    const result = await identityService.registerUser({
      email,
      password,
      firstName,
      lastName,
      adminEmail: process.env.ADMIN_EMAIL,
    });

    return res.json(result);
  } catch (err: any) {
    console.error("Register error:", err);
    return res
      .status(400)
      .json({ error: err.message || "Registration failed" });
  }
});

/**
 * POST /api/auth/login
 * Local authentication (email + password)
 */
identityRouter.post(
  "/login",
  passport.authenticate("local"),
  (req: Request, res: Response) => {
    return res.json({ user: req.user });
  }
);

/**
 * GET /api/auth/google
 * Initiate Google OAuth flow
 */
identityRouter.get(
  "/google",
  passport.authenticate("google", { scope: ["profile", "email"] })
);

/**
 * GET /api/auth/google/callback
 * Google OAuth callback
 */
identityRouter.get(
  "/google/callback",
  passport.authenticate("google", { failureRedirect: "/login?error=auth_failed" }),
  (req: Request, res: Response) => {
    if (!req.user) {
      return res.redirect("/login?error=pending_approval");
    }
    return res.redirect("/");
  }
);

/**
 * POST /api/auth/logout
 * Logout current user
 */
identityRouter.post("/logout", (req: Request, res: Response, next: NextFunction) => {
  req.logout((err) => {
    if (err) return next(err);
    res.json({ message: "Logged out" });
  });
});

/**
 * GET /api/auth/me
 * Get current authenticated user
 */
identityRouter.get("/me", (req: Request, res: Response) => {
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
 * Get all users (pending + active)
 * Requires: Admin role
 */
identityRouter.get(
  "/admin/users",
  authMiddleware,
  requireAdmin,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const users = await identityService.getAllUsers();
      const sanitized = users.map((u: any) => ({
        id: u.id,
        email: u.email,
        status: u.status,
        roles: u.roles || [],
        firstName: u.firstName,
        lastName: u.lastName,
        createdAt: u.createdAt,
      }));

      return res.json({ users: sanitized });
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
  authMiddleware,
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
  authMiddleware,
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
  authMiddleware,
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
 * GET /api/auth/admin/users/:userId
 * Get details of a specific user
 * Requires: Admin role
 */
identityRouter.get(
  "/admin/users/:userId",
  authMiddleware,
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
