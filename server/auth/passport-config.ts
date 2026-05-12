import type { Request } from "express";
import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Strategy as GoogleStrategy, type Profile as GoogleProfile } from "passport-google-oauth20";
import bcrypt from "bcrypt";
import { identityStorage } from "../modules/identity-access/storage";
import { config } from "../config";
import { resolveTenantSlugForRequest } from "../modules/identity-access/tenant-context";

// Configure all passport strategies
export function configurePassport() {
  // Local email/password strategy
  passport.use(
    new LocalStrategy({ usernameField: "email", passwordField: "password" }, async (email, password, done) => {
      try {
        const user = await identityStorage.getUserByEmail(email.toLowerCase());
        if (!user) {
          return done(null, false, { message: "Invalid email or password" }); // S-08 prevent enumeration
        }

        if (!user.passwordHash) {
          return done(null, false, { message: "Invalid email or password" });
        }

        const isValid = await bcrypt.compare(password, user.passwordHash);
        if (!isValid) {
          return done(null, false, { message: "Invalid email or password" });
        }

        return done(null, user);
      } catch (err) {
        return done(err as Error);
      }
    })
  );

  // Google OAuth strategy
  if (config.google.clientId && config.google.clientSecret) {
    passport.use(
      new GoogleStrategy(
        {
          clientID: config.google.clientId || "DUMMY_ID",
          clientSecret: config.google.clientSecret || "DUMMY_SECRET",
          callbackURL: "/api/auth/google/callback",
          passReqToCallback: true,
          proxy: true,
        },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        async (req: Request, _accessToken: string, _refreshToken: string, _params: unknown, profile: GoogleProfile, done: (err: Error | null, user?: any, info?: { message?: string }) => void) => {
          try {
            const provider = "google";
            const providerId = profile.id;
            const email = profile.emails?.[0]?.value?.toLowerCase();
            const resolvedTenantSlug = resolveTenantSlugForRequest(req);

            // Try provider match first
            let user = await identityStorage.getUserByProviderId(provider, providerId);

            // If not found by provider, try by email to avoid duplicates
            if (!user && email) {
              user = await identityStorage.getUserByEmail(email);
            }

            if (!user) {
              user = await identityStorage.createUser({
                email: email ?? `${providerId}@google-oauth.local`,
                provider,
                providerId,
                firstName: profile.name?.givenName,
                lastName: profile.name?.familyName,
                profileImageUrl: profile.photos?.[0]?.value,
              });
              const defaultOrg = await identityStorage.getOrganizationBySlug(
                resolvedTenantSlug
              );
              if (defaultOrg) {
                await identityStorage.upsertOrgMembership({
                  userId: user.id,
                  orgId: defaultOrg.id,
                  roles: ["student"],
                  status: "pending",
                });
              }
            }

            const memberships = await identityStorage.listUserMembershipsWithOrgs(
              user.id
            );
            if (memberships.length === 0) {
              const defaultOrg = await identityStorage.getOrganizationBySlug(
                resolvedTenantSlug
              );
              if (defaultOrg) {
                await identityStorage.upsertOrgMembership({
                  userId: user.id,
                  orgId: defaultOrg.id,
                  roles: ["student"],
                  status: "pending",
                });
              }
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
    // Register a dummy strategy for "google" to prevent Passport from crashing when routes are hit
    passport.use("google", {
      authenticate: function () {
        this.fail("Google OAuth is not configured on this server.", 400);
      }
    } as any);
  }

  // No session serialization needed for stateless JWT
}
