import { Router } from "express";
import passport from "passport";
import bcrypt from "bcrypt";
import { storage } from "../database-storage";

export const authRouter = Router();

// Registration (open signup, pending approval)
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
    const user = await storage.createUser({
      email: normalizedEmail,
      passwordHash,
      provider: "local",
      roles: [],
      status: "pending_approval",
      firstName,
      lastName,
    });

    return res.json({ message: "Account created. Awaiting admin approval.", userId: user.id });
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
