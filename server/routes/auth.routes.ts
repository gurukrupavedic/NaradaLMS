import { Router } from "express";
import passport from "passport";
import bcrypt from "bcrypt";
import { storage } from "../database-storage";

export const authRouter = Router();

// Registration (open signup, pending approval unless ADMIN_EMAIL)
authRouter.post("/register", async (req, res) => {
  try {
    const { email, password, firstName, lastName } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required" });
    }

    const normalizedEmail = String(email).toLowerCase();
    const existing = await storage.getUserByEmail(normalizedEmail);
    if (existing) {
      return res.status(400).json({ error: "Email already registered" });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    
    // Check if this email is the designated admin email
    const adminEmail = process.env.ADMIN_EMAIL?.toLowerCase();
    const isAdminEmail = adminEmail && normalizedEmail === adminEmail;
    
    const user = await storage.createUser({
      email: normalizedEmail,
      passwordHash,
      provider: "local",
      roles: isAdminEmail ? ["admin"] : [],
      status: isAdminEmail ? "active" : "pending_approval",
      firstName,
      lastName,
    });

    return res.json({ 
      message: isAdminEmail ? "Admin account created." : "Account created. Awaiting admin approval.", 
      userId: user.id,
      status: user.status 
    });
  } catch (err: any) {
    console.error("Register error", err);
    return res.status(500).json({ error: "Registration failed" });
  }
});

// Local login
authRouter.post(
  "/login",
  passport.authenticate("local"),
  (req, res) => {
    return res.json({ user: req.user });
  }
);

// Google OAuth
authRouter.get(
  "/google",
  passport.authenticate("google", { scope: ["profile", "email"] })
);

authRouter.get(
  "/google/callback",
  passport.authenticate("google", { failureRedirect: "/login?error=auth_failed" }),
  (req, res) => {
    if (!req.user) {
      return res.redirect("/login?error=pending_approval");
    }
    return res.redirect("/");
  }
);

// Logout
authRouter.post("/logout", (req, res, next) => {
  req.logout((err) => {
    if (err) return next(err);
    res.json({ message: "Logged out" });
  });
});

// Current user
authRouter.get("/me", (req, res) => {
  if (!req.user) {
    return res.status(401).json({ error: "Not authenticated" });
  }
  return res.json({ user: req.user });
});

// Admin: Get all users (pending + active)
authRouter.get("/admin/users", async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: "Not authenticated" });
    }
    
    const user = req.user as any;
    if (!user.roles?.includes("admin")) {
      return res.status(403).json({ error: "Admin access required" });
    }

    const users = await storage.getAllUsers();
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
    console.error("Get users error", err);
    return res.status(500).json({ error: "Failed to fetch users" });
  }
});

// Admin: Approve a user (set status to active, add student role)
authRouter.post("/admin/users/:userId/approve", async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: "Not authenticated" });
    }
    
    const user = req.user as any;
    if (!user.roles?.includes("admin")) {
      return res.status(403).json({ error: "Admin access required" });
    }

    const { userId } = req.params;
    const targetUser = await storage.getUser(userId);
    if (!targetUser) {
      return res.status(404).json({ error: "User not found" });
    }

    // Add 'student' role if not present
    const updatedRoles = Array.isArray(targetUser.roles) ? [...targetUser.roles] : [];
    if (!updatedRoles.includes("student")) {
      updatedRoles.push("student");
    }

    // Update roles and status
    await storage.updateUserRoles(userId, updatedRoles);
    const approvedUser = await storage.updateUserStatus(userId, "active");

    return res.json({ 
      message: "User approved", 
      user: {
        id: approvedUser.id,
        email: approvedUser.email,
        status: approvedUser.status,
        roles: approvedUser.roles,
      }
    });
  } catch (err: any) {
    console.error("Approve user error", err);
    return res.status(500).json({ error: "Failed to approve user" });
  }
});
