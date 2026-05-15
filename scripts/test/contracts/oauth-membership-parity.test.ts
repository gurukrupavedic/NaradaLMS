import { IdentityService } from "../../../server/modules/identity-access/service";
import { identityStorage } from "../../../server/modules/identity-access/storage";

const passed: string[] = [];
const failed: { name: string; error: string }[] = [];

function assert(condition: boolean, name: string, message?: string) {
  if (condition) {
    passed.push(name);
    return;
  }

  failed.push({ name, error: message ?? "Assertion failed" });
}

function assertEqual<T>(actual: T, expected: T, name: string) {
  assert(
    actual === expected,
    name,
    `Expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`
  );
}

async function withPatchedStorage<T>(
  patches: Partial<typeof identityStorage>,
  fn: () => Promise<T>
): Promise<T> {
  const entries = Object.entries(patches) as [
    keyof typeof identityStorage,
    unknown,
  ][];
  const originals = entries.map(([key]) => [key, identityStorage[key]] as const);

  for (const [key, value] of entries) {
    (identityStorage as Record<string, unknown>)[key as string] = value;
  }

  try {
    return await fn();
  } finally {
    for (const [key, value] of originals) {
      (identityStorage as Record<string, unknown>)[key as string] = value;
    }
  }
}

type ResolveOAuthLogin = (data: {
  provider: string;
  providerId: string;
  email?: string;
  firstName?: string;
  lastName?: string;
  profileImageUrl?: string;
  tenantSlug: string;
}) => Promise<{
  user: { id: string; email: string };
  membershipResult: {
    result: string;
    membership: { orgId: string; orgSlug: string; status: string };
  };
}>;

function getResolveOAuthLogin(service: IdentityService) {
  return (service as IdentityService & {
    resolveOAuthLogin?: ResolveOAuthLogin;
  }).resolveOAuthLogin;
}

async function testExistingUserInAnotherOrgGetsPendingTargetMembership() {
  const service = new IdentityService();
  let createUserCalled = false;
  let upsertArgs:
    | {
        userId: string;
        orgId: string;
        roles: string[];
        status: string;
      }
    | undefined;

  await withPatchedStorage(
    {
      getUserByProviderId: async () => null,
      getUserByEmail: async () => ({
        id: "user-slmts",
        email: "member@example.com",
      }),
      getOrganizationBySlug: async () => ({
        id: "org-rr",
        slug: "rr",
        name: "Sri Raja Rajeswari Pathasala",
      }),
      getMembershipByUserAndOrg: async () => null,
      createUser: async () => {
        createUserCalled = true;
        return { id: "unexpected-user", email: "member@example.com" };
      },
      upsertOrgMembership: async (args) => {
        upsertArgs = args;
      },
    } as Partial<typeof identityStorage>,
    async () => {
      const resolveOAuthLogin = getResolveOAuthLogin(service);

      assert(
        typeof resolveOAuthLogin === "function",
        "resolveOAuthLogin exists on IdentityService",
        "Expected IdentityService.resolveOAuthLogin to be implemented"
      );

      if (!resolveOAuthLogin) {
        return;
      }

      const result = await resolveOAuthLogin.call(service, {
        provider: "google",
        providerId: "google-user-1",
        email: "member@example.com",
        tenantSlug: "rr",
      });

      assertEqual(
        result.user.id,
        "user-slmts",
        "oauth parity keeps existing user identity"
      );
      assertEqual(
        result.membershipResult.result,
        "created_pending",
        "oauth parity creates pending target membership for existing cross-org user"
      );
      assertEqual(
        result.membershipResult.membership.orgSlug,
        "rr",
        "oauth parity targets the resolved tenant slug"
      );
      assertEqual(
        result.membershipResult.membership.status,
        "pending",
        "oauth parity keeps new tenant access pending"
      );
    }
  );

  assert(
    createUserCalled === false,
    "oauth parity does not create a duplicate user when email already exists"
  );
  assertEqual(
    JSON.stringify(upsertArgs),
    JSON.stringify({
      userId: "user-slmts",
      orgId: "org-rr",
      roles: ["student"],
      status: "pending",
    }),
    "oauth parity creates a pending student membership for the target tenant"
  );
}

async function testExistingPendingMembershipRemainsPending() {
  const service = new IdentityService();
  let upsertCalled = false;

  await withPatchedStorage(
    {
      getUserByProviderId: async () => ({
        id: "user-pending",
        email: "pending@example.com",
      }),
      getOrganizationBySlug: async () => ({
        id: "org-rr",
        slug: "rr",
        name: "Sri Raja Rajeswari Pathasala",
      }),
      getMembershipByUserAndOrg: async () => ({
        membershipId: "membership-rr",
        userId: "user-pending",
        orgId: "org-rr",
        orgSlug: "rr",
        orgName: "Sri Raja Rajeswari Pathasala",
        roles: ["student"],
        status: "pending",
      }),
      upsertOrgMembership: async () => {
        upsertCalled = true;
      },
    } as Partial<typeof identityStorage>,
    async () => {
      const resolveOAuthLogin = getResolveOAuthLogin(service);

      assert(
        typeof resolveOAuthLogin === "function",
        "resolveOAuthLogin exists for pending membership path"
      );

      if (!resolveOAuthLogin) {
        return;
      }

      const result = await resolveOAuthLogin.call(service, {
        provider: "google",
        providerId: "google-pending-1",
        email: "pending@example.com",
        tenantSlug: "rr",
      });

      assertEqual(
        result.membershipResult.result,
        "already_pending",
        "oauth parity preserves existing pending membership"
      );
      assertEqual(
        result.membershipResult.membership.status,
        "pending",
        "oauth parity returns pending status for existing pending membership"
      );
    }
  );

  assert(
    upsertCalled === false,
    "oauth parity does not rewrite an existing pending membership"
  );
}

async function testExistingInactiveMembershipDoesNotReopen() {
  const service = new IdentityService();
  let upsertCalled = false;

  await withPatchedStorage(
    {
      getUserByProviderId: async () => null,
      getUserByEmail: async () => ({
        id: "user-inactive",
        email: "inactive@example.com",
      }),
      getOrganizationBySlug: async () => ({
        id: "org-rr",
        slug: "rr",
        name: "Sri Raja Rajeswari Pathasala",
      }),
      getMembershipByUserAndOrg: async () => ({
        membershipId: "membership-inactive",
        userId: "user-inactive",
        orgId: "org-rr",
        orgSlug: "rr",
        orgName: "Sri Raja Rajeswari Pathasala",
        roles: ["student"],
        status: "inactive",
      }),
      upsertOrgMembership: async () => {
        upsertCalled = true;
      },
    } as Partial<typeof identityStorage>,
    async () => {
      const resolveOAuthLogin = getResolveOAuthLogin(service);

      assert(
        typeof resolveOAuthLogin === "function",
        "resolveOAuthLogin exists for inactive membership path"
      );

      if (!resolveOAuthLogin) {
        return;
      }

      const result = await resolveOAuthLogin.call(service, {
        provider: "google",
        providerId: "google-inactive-1",
        email: "inactive@example.com",
        tenantSlug: "rr",
      });

      assertEqual(
        result.membershipResult.result,
        "inactive_membership",
        "oauth parity keeps inactive memberships closed"
      );
      assertEqual(
        result.membershipResult.membership.status,
        "inactive",
        "oauth parity returns inactive status without reopening membership"
      );
    }
  );

  assert(
    upsertCalled === false,
    "oauth parity does not reopen inactive memberships"
  );
}

async function testExistingRejectedMembershipDoesNotReopen() {
  const service = new IdentityService();
  let upsertCalled = false;

  await withPatchedStorage(
    {
      getUserByProviderId: async () => null,
      getUserByEmail: async () => ({
        id: "user-rejected",
        email: "rejected@example.com",
      }),
      getOrganizationBySlug: async () => ({
        id: "org-rr",
        slug: "rr",
        name: "Sri Raja Rajeswari Pathasala",
      }),
      getMembershipByUserAndOrg: async () => ({
        membershipId: "membership-rejected",
        userId: "user-rejected",
        orgId: "org-rr",
        orgSlug: "rr",
        orgName: "Sri Raja Rajeswari Pathasala",
        roles: ["student"],
        status: "rejected",
      }),
      upsertOrgMembership: async () => {
        upsertCalled = true;
      },
    } as Partial<typeof identityStorage>,
    async () => {
      const resolveOAuthLogin = getResolveOAuthLogin(service);

      assert(
        typeof resolveOAuthLogin === "function",
        "resolveOAuthLogin exists for rejected membership path"
      );

      if (!resolveOAuthLogin) {
        return;
      }

      const result = await resolveOAuthLogin.call(service, {
        provider: "google",
        providerId: "google-rejected-1",
        email: "rejected@example.com",
        tenantSlug: "rr",
      });

      assertEqual(
        result.membershipResult.result,
        "rejected_membership",
        "oauth parity keeps rejected memberships closed"
      );
      assertEqual(
        result.membershipResult.membership.status,
        "rejected",
        "oauth parity returns rejected status without reopening membership"
      );
    }
  );

  assert(
    upsertCalled === false,
    "oauth parity does not reopen rejected memberships"
  );
}

async function testExistingActiveMembershipAllowsNormalLogin() {
  const service = new IdentityService();
  let upsertCalled = false;

  await withPatchedStorage(
    {
      getUserByProviderId: async () => ({
        id: "user-active",
        email: "active@example.com",
      }),
      getOrganizationBySlug: async () => ({
        id: "org-rr",
        slug: "rr",
        name: "Sri Raja Rajeswari Pathasala",
      }),
      getMembershipByUserAndOrg: async () => ({
        membershipId: "membership-active",
        userId: "user-active",
        orgId: "org-rr",
        orgSlug: "rr",
        orgName: "Sri Raja Rajeswari Pathasala",
        roles: ["student"],
        status: "active",
      }),
      upsertOrgMembership: async () => {
        upsertCalled = true;
      },
    } as Partial<typeof identityStorage>,
    async () => {
      const resolveOAuthLogin = getResolveOAuthLogin(service);

      assert(
        typeof resolveOAuthLogin === "function",
        "resolveOAuthLogin exists for active membership path"
      );

      if (!resolveOAuthLogin) {
        return;
      }

      const result = await resolveOAuthLogin.call(service, {
        provider: "google",
        providerId: "google-active-1",
        email: "active@example.com",
        tenantSlug: "rr",
      });

      assertEqual(
        result.membershipResult.result,
        "already_active",
        "oauth parity allows normal login for active tenant membership"
      );
      assertEqual(
        result.membershipResult.membership.status,
        "active",
        "oauth parity preserves active tenant membership"
      );
    }
  );

  assert(
    upsertCalled === false,
    "oauth parity does not rewrite active memberships"
  );
}

async function testNewGoogleUserGetsPendingMembership() {
  const service = new IdentityService();
  let createUserArgs:
    | {
        email: string;
        provider: string;
        providerId: string;
      }
    | undefined;

  await withPatchedStorage(
    {
      getUserByProviderId: async () => null,
      getUserByEmail: async () => null,
      createUser: async (args) => {
        createUserArgs = {
          email: args.email,
          provider: args.provider,
          providerId: args.providerId,
        };
        return { id: "user-new-google", email: args.email };
      },
      getOrganizationBySlug: async () => ({
        id: "org-rr",
        slug: "rr",
        name: "Sri Raja Rajeswari Pathasala",
      }),
      getMembershipByUserAndOrg: async () => null,
      upsertOrgMembership: async () => undefined,
    } as Partial<typeof identityStorage>,
    async () => {
      const resolveOAuthLogin = getResolveOAuthLogin(service);

      assert(
        typeof resolveOAuthLogin === "function",
        "resolveOAuthLogin exists for new user path"
      );

      if (!resolveOAuthLogin) {
        return;
      }

      const result = await resolveOAuthLogin.call(service, {
        provider: "google",
        providerId: "google-new-1",
        email: "new-google@example.com",
        firstName: "New",
        lastName: "User",
        tenantSlug: "rr",
      });

      assertEqual(
        result.user.id,
        "user-new-google",
        "oauth parity returns the newly created google user"
      );
      assertEqual(
        result.membershipResult.result,
        "created_pending",
        "oauth parity creates pending membership for new google user"
      );
    }
  );

  assertEqual(
    JSON.stringify(createUserArgs),
    JSON.stringify({
      email: "new-google@example.com",
      provider: "google",
      providerId: "google-new-1",
    }),
    "oauth parity creates google-backed user before membership evaluation"
  );
}

await testExistingUserInAnotherOrgGetsPendingTargetMembership();
await testExistingPendingMembershipRemainsPending();
await testExistingInactiveMembershipDoesNotReopen();
await testExistingRejectedMembershipDoesNotReopen();
await testExistingActiveMembershipAllowsNormalLogin();
await testNewGoogleUserGetsPendingMembership();

if (failed.length > 0) {
  console.error("Failed:", failed);
  process.exit(1);
}

console.log(`oauth-membership-parity: ${passed.length} assertions passed.`);
