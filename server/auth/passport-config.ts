import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Strategy as GoogleStrategy, type Profile as GoogleProfile } from "passport-google-oauth20";
import bcrypt from "bcrypt";
import { storage } from "../database-storage";

// Configure all passport strategies
export function configurePassport() {
  // Local email/password strategy
  passport.use(
    new LocalStrategy({ usernameField: "email", passwordField: "password" }, async (email, password, done) => {
      try {
        const user = await storage.getUserByEmail(email.toLowerCase());
        if (!user) {
          return done(null, false, { message: "User not found" });
        }

        if (user.status === "pending_approval") {
          return done(null, false, { message: "Your account is awaiting admin approval" });
        }
        if (user.status === "inactive") {
          return done(null, false, { message: "Your account has been disabled" });
        }

        if (!user.passwordHash) {
          return done(null, false, { message: "Use social login for this account" });
        }

        const isValid = await bcrypt.compare(password, user.passwordHash);
        if (!isValid) {
          return done(null, false, { message: "Invalid credentials" });
        }

        return done(null, user);
      } catch (err) {
        return done(err as Error);
      }
    })
  );

  // Google OAuth strategy
  if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
    passport.use(
      new GoogleStrategy(
        {
          clientID: process.env.GOOGLE_CLIENT_ID,
          clientSecret: process.env.GOOGLE_CLIENT_SECRET,
          callbackURL: "/api/auth/google/callback",
        },
        async (_accessToken: string, _refreshToken: string, profile: GoogleProfile, done) => {
          try {
            const provider = "google";
            const providerId = profile.id;
            const email = profile.emails?.[0]?.value?.toLowerCase();

            // Try provider match first
            let user = await storage.getUserByProviderId(provider, providerId);

            // If not found by provider, try by email to avoid duplicates
            if (!user && email) {
              user = await storage.getUserByEmail(email);
            }

            if (!user) {
              user = await storage.createUser({
                email: email ?? `${providerId}@google-oauth.local`,
                provider,
                providerId,
                firstName: profile.name?.givenName,
                lastName: profile.name?.familyName,
                profileImageUrl: profile.photos?.[0]?.value,
                roles: [],
                status: "pending_approval",
              });
            }

            if (user.status === "pending_approval") {
              return done(null, false, { message: "Your account is awaiting admin approval" });
            }
            if (user.status === "inactive") {
              return done(null, false, { message: "Your account has been disabled" });
            }

            return done(null, user);
          } catch (err) {
            return done(err as Error);
          }
        }
      )
    );
  } else {
    console.warn("Google OAuth not configured. Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET to enable.");
  }

  // Session serialization
  passport.serializeUser((user: any, done) => {
    done(null, user.id);
  });

  passport.deserializeUser(async (id: string, done) => {
    try {
      const user = await storage.getUser(id);
      done(null, user || false);
    } catch (err) {
      done(err as Error);
    }
  });
}
