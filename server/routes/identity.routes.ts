import { Router, Request, Response, NextFunction } from "express";
import passport from "passport";
import { identityService } from "../modules/identity-access/service";
import { authMiddleware, requireSuperAdmin } from "../shared/middleware/auth";
import { jwtAuth } from "../middleware/jwt-auth.middleware";
import { generateToken } from "../auth/jwt.utils";
import { identityStorage } from "../modules/identity-access/storage";
import rateLimit from "express-rate-limit";
import { validateRequest } from "../utils/validation";
import { z } from "zod";
import { config } from "../config";
import { catchAsync } from "../utils/catchAsync";
import {
  buildOAuthState,
  resolveRequestedPostAuthRedirect,
  resolveSafePostAuthRedirect,
  resolveTenantSlugForRequest,
} from "../modules/identity-access/tenant-context";

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
    tenantSlug: z.enum(["slmts", "rr"]).optional(),
  }),
});

const requestMembershipSchema = z.object({
  body: z.object({
    tenantSlug: z.enum(["slmts", "rr"]).optional(),
  }),
});

const switchOrgSchema = z.object({
  body: z.object({
    orgId: z.string().uuid(),
  }),
});

function setAuthTokenCookie(res: Response, token: string) {
  res.cookie("auth_token", token, {
    httpOnly: true,
    secure: config.env === "production",
    sameSite: "strict",
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });
}

function clearAuthTokenCookie(res: Response) {
  res.clearCookie("auth_token", {
    httpOnly: true,
    secure: config.env === "production",
    sameSite: "strict",
  });
}

function buildAuthPageRedirect(rawState: string | undefined, error: string): string {
  const safeRedirectUrl = new URL(resolveSafePostAuthRedirect(rawState));
  const authPageUrl = new URL("/", safeRedirectUrl.origin);
  authPageUrl.searchParams.set("error", error);
  return authPageUrl.toString();
}

/**
 * POST /api/auth/register
 * Register a new user (pending approval unless admin email)
 */
identityRouter.post(
  "/register",
  authLimiter,
  validateRequest(registerSchema),
  catchAsync(async (req: Request, res: Response) => {
    const { email, password, firstName, lastName, tenantSlug } = req.body;

    const resolvedTenant = resolveTenantSlugForRequest(req, tenantSlug);

    const result = await identityService.registerUser({
      email,
      password,
      firstName,
      lastName,
      adminEmail: config.adminEmail,
      tenantSlug: resolvedTenant,
    });

    return res.json(result);
  })
);

/**
 * POST /api/auth/login
 * Local authentication (email + password)
 */
identityRouter.post(
  "/login",
  authLimiter,
  (req: Request, res: Response, next: NextFunction) => {
    passport.authenticate(
      "local",
      { session: false },
      (
        err: unknown,
        user:
          | false
          | null
          | {
              id: string;
              email: string;
              firstName?: string | null;
              lastName?: string | null;
            },
        info: { message?: string }
      ) => {
        if (err) {
          return next(err);
        }
        if (!user) {
          return res
            .status(401)
            .json({ error: info?.message || "Invalid credentials" });
        }

        void (async () => {
          try {
            const claims = await identityStorage.getJwtSignClaimsForUser(
              user.id
            );
            if (!claims) {
              return res
                .status(500)
                .json({ error: "Failed to build session" });
            }

            const token = generateToken(claims);

            setAuthTokenCookie(res, token);

            const memberships =
              await identityStorage.listUserMembershipsWithOrgs(user.id);
            const hasActiveMembership = memberships.some(
              (m) => m.status === "active"
            );

            return res.json({
              user: {
                id: user.id,
                email: user.email,
                firstName: user.firstName,
                lastName: user.lastName,
                isSuperAdmin: claims.isSuperAdmin,
                currentOrgId: claims.currentOrgId,
                orgRoles: claims.orgRoles,
                orgMembershipStatus: claims.orgMembershipStatus,
              },
              loginState: {
                hasActiveMembership,
                memberships: memberships.map((m) => ({
                  orgSlug: m.orgSlug,
                  orgName: m.orgName,
                  status: m.status,
                  roles: m.roles,
                })),
              },
            });
          } catch (e) {
            next(e);
          }
        })();
      }
    )(req, res, next);
  }
);

/**
 * GET /api/auth/google
 * Initiate Google OAuth flow
 */
identityRouter.get(
  "/google",
  (req: Request, res: Response, next: NextFunction) => {
    const state = buildOAuthState({
      tenantSlug: resolveTenantSlugForRequest(req),
      returnTo: resolveRequestedPostAuthRedirect(req),
    });
    passport.authenticate("google", {
      session: false,
      scope: ["profile", "email"],
      state,
    })(req, res, next);
  }
);

/**
 * GET /api/auth/google/callback
 * Google OAuth callback
 */
identityRouter.get(
  "/google/callback",
  (req: Request, res: Response, next: NextFunction) => {
    passport.authenticate(
      "google",
      { session: false },
      (
        err: unknown,
        user:
          | false
          | null
          | {
              id: string;
            }
      ) => {
        const rawState =
          typeof req.query.state === "string" ? req.query.state : undefined;

        if (err) {
          return next(err);
        }

        if (!user) {
          return res.redirect(buildAuthPageRedirect(rawState, "auth_failed"));
        }

        req.user = user as Express.User;
        return next();
      }
    )(req, res, next);
  },
  catchAsync(async (req: Request, res: Response) => {
    const rawState =
      typeof req.query.state === "string" ? req.query.state : undefined;
    const redirectUrl = new URL(resolveSafePostAuthRedirect(rawState));

    if (!req.user) {
      return res.redirect(buildAuthPageRedirect(rawState, "session_failed"));
    }

    const oauthUser = req.user as { id: string };

    const claims = await identityStorage.getJwtSignClaimsForUser(oauthUser.id);
    if (!claims) {
      return res.redirect(buildAuthPageRedirect(rawState, "session_failed"));
    }

    const token = generateToken(claims);

    setAuthTokenCookie(res, token);

    const isAdminReturn = redirectUrl.pathname.startsWith("/admin");
    const canAccessAdmin =
      claims.isSuperAdmin || Boolean(claims.orgRoles?.includes("admin"));
    if (isAdminReturn && !canAccessAdmin) {
      clearAuthTokenCookie(res);
      return res.redirect(buildAuthPageRedirect(rawState, "access_denied"));
    }

    return res.redirect(redirectUrl.toString());
  })
);

/**
 * POST /api/auth/request-membership
 * Authenticated user requests membership in the tenant resolved for the current portal.
 */
identityRouter.post(
  "/request-membership",
  jwtAuth,
  validateRequest(requestMembershipSchema),
  catchAsync(async (req: Request, res: Response) => {
    const session = req.user as Express.User;
    const { tenantSlug } = req.body as { tenantSlug?: string };
    const resolvedTenant = resolveTenantSlugForRequest(req, tenantSlug);

    try {
      const result = await identityService.requestMembership({
        userId: session.id,
        tenantSlug: resolvedTenant,
      });

      const messageByResult: Record<
        typeof result.result,
        string
      > = {
        created_pending:
          "Your membership request is pending approval.",
        already_pending:
          "Your membership request is already pending approval.",
        already_active:
          "You already have access to this organization.",
        inactive_membership:
          "Your membership is inactive. Contact a super-admin to restore access.",
        rejected_membership:
          "Your membership request was rejected. Contact a super-admin if you need to reapply.",
      };

      return res.json({
        ...result,
        message: messageByResult[result.result],
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Request failed";
      const status = message.toLowerCase().includes("not available") ? 404 : 400;
      return res.status(status).json({ error: message });
    }
  })
);

/**
 * POST /api/auth/switch-org
 * Active membership required for target org; reissues JWT + auth cookie.
 */
identityRouter.post(
  "/switch-org",
  jwtAuth,
  validateRequest(switchOrgSchema),
  catchAsync(async (req: Request, res: Response) => {
    const { orgId } = req.body as { orgId: string };
    const session = req.user as Express.User;

    const claims = await identityStorage.getJwtSignClaimsForUser(session.id, {
      targetOrgId: orgId,
    });
    if (!claims) {
      return res.status(403).json({
        error: "No active membership for this organization",
      });
    }

    const token = generateToken(claims);
    setAuthTokenCookie(res, token);

    const profile = await identityStorage.getUser(session.id);

    return res.json({
      user: {
        id: session.id,
        email: session.email,
        firstName: profile?.firstName ?? undefined,
        lastName: profile?.lastName ?? undefined,
        isSuperAdmin: claims.isSuperAdmin,
        currentOrgId: claims.currentOrgId,
        orgRoles: claims.orgRoles,
        orgMembershipStatus: claims.orgMembershipStatus,
      },
    });
  })
);

/**
 * POST /api/auth/logout
 * Logout current user
 */
identityRouter.post("/logout", (req: Request, res: Response) => {
  // Clear the HttpOnly cookie
  clearAuthTokenCookie(res);

  res.json({ message: "Logged out" });
});

/**
 * GET /api/auth/me
 * Get current authenticated user
 */
identityRouter.get(
  "/me",
  jwtAuth,
  catchAsync(async (req: Request, res: Response) => {
    if (!req.user) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    const session = req.user;
    const profile = await identityStorage.getUser(session.id);
    const memberships = await identityStorage.listUserMembershipsWithOrgs(
      session.id
    );
    const hasActiveMembership = memberships.some((m) => m.status === "active");

    return res.json({
      user: {
        id: session.id,
        email: session.email,
        firstName: profile?.firstName ?? undefined,
        lastName: profile?.lastName ?? undefined,
        profileImageUrl: profile?.profileImageUrl ?? undefined,
        isSuperAdmin: session.isSuperAdmin,
        currentOrgId: session.currentOrgId,
        orgRoles: session.orgRoles,
        orgMembershipStatus: session.orgMembershipStatus,
      },
      memberships,
      hasActiveMembership,
    });
  })
);

// ======================
// Super-admin governance (membership model)
// ======================

const membershipIdParamSchema = z.object({
  params: z.object({ membershipId: z.string().uuid() }),
});

const patchMembershipRolesSchema = z.object({
  params: z.object({ membershipId: z.string().uuid() }),
  body: z.object({
    roles: z
      .array(z.enum(["student", "instructor", "admin"]))
      .min(1, "At least one role is required"),
  }),
});

function governanceError(res: Response, err: unknown, fallbackStatus = 400) {
  const message = err instanceof Error ? err.message : "Request failed";
  const lower = message.toLowerCase();
  const status =
    lower.includes("not found") || lower.includes("membership not found")
      ? 404
      : fallbackStatus;
  return res.status(status).json({ error: message });
}

/**
 * GET /api/auth/admin/users
 * Super-admin: users with nested org memberships; filters by membership state / org.
 */
identityRouter.get(
  "/admin/users",
  jwtAuth,
  requireSuperAdmin,
  catchAsync(async (req: Request, res: Response) => {
    const limit = req.query.limit ? Math.min(parseInt(req.query.limit as string, 10), 100) : 50;
    const offset = req.query.offset ? parseInt(req.query.offset as string, 10) : 0;
    const search = (req.query.search as string)?.trim() || undefined;
    const orgSlug =
      req.query.orgSlug === "slmts" || req.query.orgSlug === "rr"
        ? (req.query.orgSlug as "slmts" | "rr")
        : undefined;

    let membershipStatus = req.query.membershipStatus as string | undefined;
    const legacyStatus = req.query.status as string | undefined;
    if (!membershipStatus && legacyStatus === "pending_approval") {
      membershipStatus = "pending";
    }
    if (!membershipStatus && legacyStatus === "active") {
      membershipStatus = "active";
    }
    if (!membershipStatus && legacyStatus === "inactive") {
      membershipStatus = "inactive";
    }

    const ms =
      membershipStatus &&
      ["pending", "active", "inactive", "rejected"].includes(membershipStatus)
        ? (membershipStatus as "pending" | "active" | "inactive" | "rejected")
        : undefined;

    const roleParam = req.query.role as string | undefined;
    const membershipHasRole =
      roleParam && ["student", "instructor", "admin"].includes(roleParam)
        ? roleParam
        : undefined;

    try {
      const { users, total, statusCounts } = await identityService.listGovernanceUsers(
        limit,
        offset,
        {
          membershipStatus: ms,
          orgSlug,
          membershipHasRole,
          search,
        }
      );

      return res.json({
        users,
        pagination: { limit, offset, total },
        statusCounts: {
          all: statusCounts.all,
          pending_approval: statusCounts.pending,
          active: statusCounts.active,
          inactive: statusCounts.inactive,
          rejected: statusCounts.rejected,
        },
      });
    } catch (err: unknown) {
      return governanceError(res, err);
    }
  })
);

/**
 * GET /api/auth/admin/users/:userId
 * Super-admin: user + memberships
 */
identityRouter.get(
  "/admin/users/:userId",
  jwtAuth,
  requireSuperAdmin,
  catchAsync(async (req: Request, res: Response) => {
    try {
      const user = await identityService.getUserWithMembershipsForGovernance(
        req.params.userId
      );
      return res.json(user);
    } catch (err: unknown) {
      return governanceError(res, err, 404);
    }
  })
);

identityRouter.post(
  "/admin/memberships/:membershipId/approve",
  jwtAuth,
  requireSuperAdmin,
  validateRequest(membershipIdParamSchema),
  catchAsync(async (req: Request, res: Response) => {
    const session = req.user as Express.User;
    try {
      const result = await identityService.approveMembership(
        req.params.membershipId,
        session.id
      );
      return res.json(result);
    } catch (err: unknown) {
      return governanceError(res, err);
    }
  })
);

identityRouter.post(
  "/admin/memberships/:membershipId/reject",
  jwtAuth,
  requireSuperAdmin,
  validateRequest(membershipIdParamSchema),
  catchAsync(async (req: Request, res: Response) => {
    const session = req.user as Express.User;
    try {
      const result = await identityService.rejectMembership(
        req.params.membershipId,
        session.id
      );
      return res.json(result);
    } catch (err: unknown) {
      return governanceError(res, err);
    }
  })
);

identityRouter.post(
  "/admin/memberships/:membershipId/disable",
  jwtAuth,
  requireSuperAdmin,
  validateRequest(membershipIdParamSchema),
  catchAsync(async (req: Request, res: Response) => {
    const session = req.user as Express.User;
    try {
      const result = await identityService.setMembershipActiveFlag(
        req.params.membershipId,
        "inactive",
        session.id
      );
      return res.json(result);
    } catch (err: unknown) {
      return governanceError(res, err);
    }
  })
);

identityRouter.post(
  "/admin/memberships/:membershipId/enable",
  jwtAuth,
  requireSuperAdmin,
  validateRequest(membershipIdParamSchema),
  catchAsync(async (req: Request, res: Response) => {
    const session = req.user as Express.User;
    try {
      const result = await identityService.setMembershipActiveFlag(
        req.params.membershipId,
        "active",
        session.id
      );
      return res.json(result);
    } catch (err: unknown) {
      return governanceError(res, err);
    }
  })
);

identityRouter.patch(
  "/admin/memberships/:membershipId/roles",
  jwtAuth,
  requireSuperAdmin,
  validateRequest(patchMembershipRolesSchema),
  catchAsync(async (req: Request, res: Response) => {
    const session = req.user as Express.User;
    const { roles } = req.body as { roles: string[] };
    try {
      const result = await identityService.setMembershipRoles(
        req.params.membershipId,
        roles,
        session.id
      );
      return res.json(result);
    } catch (err: unknown) {
      return governanceError(res, err);
    }
  })
);

const userIdParamSchema = z.object({
  params: z.object({ userId: z.string().min(1) }),
});

identityRouter.post(
  "/admin/users/:userId/super-admin/grant",
  jwtAuth,
  requireSuperAdmin,
  validateRequest(userIdParamSchema),
  catchAsync(async (req: Request, res: Response) => {
    const session = req.user as Express.User;
    try {
      const result = await identityService.grantSuperAdmin(
        req.params.userId,
        session.id
      );
      return res.json(result);
    } catch (err: unknown) {
      return governanceError(res, err);
    }
  })
);

identityRouter.post(
  "/admin/users/:userId/super-admin/revoke",
  jwtAuth,
  requireSuperAdmin,
  validateRequest(userIdParamSchema),
  catchAsync(async (req: Request, res: Response) => {
    const session = req.user as Express.User;
    try {
      const result = await identityService.revokeSuperAdmin(
        req.params.userId,
        session.id
      );
      return res.json(result);
    } catch (err: unknown) {
      return governanceError(res, err);
    }
  })
);

export default identityRouter;
