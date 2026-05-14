import assert from "node:assert/strict";
import bcrypt from "bcrypt";
import passport from "passport";
import { configurePassport } from "../../../server/auth/passport-config";
import { identityStorage } from "../../../server/modules/identity-access/storage";

async function main() {
  const originalGetUserByEmail = identityStorage.getUserByEmail.bind(identityStorage);

  try {
    const password = "membership-first-pass";
    const passwordHash = await bcrypt.hash(password, 10);

    identityStorage.getUserByEmail = async () =>
      ({
        id: "user-local-auth",
        email: "membership-first@example.com",
        status: "inactive",
        passwordHash,
        provider: "local",
      }) as Awaited<ReturnType<typeof originalGetUserByEmail>>;

    configurePassport();
    const strategy = passport._strategy("local") as {
      _verify: (
        email: string,
        password: string,
        done: (err: Error | null, user?: unknown, info?: { message?: string }) => void
      ) => void;
    };

    const user = await new Promise<unknown>((resolve, reject) => {
      strategy._verify("membership-first@example.com", password, (err, verifiedUser, info) => {
        if (err) {
          reject(err);
          return;
        }

        if (!verifiedUser) {
          reject(
            new Error(
              `Expected local auth to succeed without a legacy status gate, got: ${
                info?.message ?? "unknown failure"
              }`
            )
          );
          return;
        }

        resolve(verifiedUser);
      });
    });

    assert.ok(user, "local strategy should return the authenticated user");
    console.log("passport-local-membership-auth: 1 assertion passed.");
  } finally {
    identityStorage.getUserByEmail = originalGetUserByEmail;
  }
}

void main().catch((error) => {
  console.error("passport-local-membership-auth failed:", error);
  process.exit(1);
});
