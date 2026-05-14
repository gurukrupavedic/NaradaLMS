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
  const entries = Object.entries(patches) as [keyof typeof identityStorage, unknown][];
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

async function testRequestMembershipCreatesPendingMembership() {
  const service = new IdentityService();
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
      getOrganizationBySlug: async (slug: string) =>
        slug === "rr"
          ? { id: "org-rr", slug: "rr", name: "Raja Rajeswari Pathasala" }
          : null,
      getMembershipByUserAndOrg: async () => null,
      upsertOrgMembership: async (args) => {
        upsertArgs = args;
      },
    } as Partial<typeof identityStorage>,
    async () => {
      const requestMembership = (service as IdentityService & {
        requestMembership?: (data: {
          userId: string;
          tenantSlug: string;
        }) => Promise<{
          result: string;
          membership: { orgId: string; orgSlug: string; status: string };
        }>;
      }).requestMembership;

      assert(
        typeof requestMembership === "function",
        "requestMembership exists on IdentityService",
        "Expected IdentityService.requestMembership to be implemented"
      );

      if (!requestMembership) {
        return;
      }

      const result = await requestMembership.call(service, {
        userId: "user-1",
        tenantSlug: "rr",
      });

      assertEqual(
        result.result,
        "created_pending",
        "requestMembership returns created_pending for first request"
      );
      assertEqual(
        result.membership.orgId,
        "org-rr",
        "requestMembership returns target org id"
      );
      assertEqual(
        result.membership.orgSlug,
        "rr",
        "requestMembership returns target org slug"
      );
      assertEqual(
        result.membership.status,
        "pending",
        "requestMembership returns pending membership status"
      );
    }
  );

  assertEqual(
    JSON.stringify(upsertArgs),
    JSON.stringify({
      userId: "user-1",
      orgId: "org-rr",
      roles: ["student"],
      status: "pending",
    }),
    "requestMembership creates pending student membership"
  );
}

async function testRequestMembershipIsIdempotentForPendingMembership() {
  const service = new IdentityService();
  let upsertCalled = false;

  await withPatchedStorage(
    {
      getOrganizationBySlug: async () => ({
        id: "org-rr",
        slug: "rr",
        name: "Raja Rajeswari Pathasala",
      }),
      getMembershipByUserAndOrg: async () => ({
        membershipId: "membership-rr",
        userId: "user-1",
        orgId: "org-rr",
        orgSlug: "rr",
        orgName: "Raja Rajeswari Pathasala",
        roles: ["student"],
        status: "pending",
      }),
      upsertOrgMembership: async () => {
        upsertCalled = true;
      },
    } as Partial<typeof identityStorage>,
    async () => {
      const requestMembership = (service as IdentityService & {
        requestMembership?: (data: {
          userId: string;
          tenantSlug: string;
        }) => Promise<{
          result: string;
          membership: { orgId: string; orgSlug: string; status: string };
        }>;
      }).requestMembership;

      assert(
        typeof requestMembership === "function",
        "requestMembership exists for pending membership path",
        "Expected IdentityService.requestMembership to be implemented"
      );

      if (!requestMembership) {
        return;
      }

      const result = await requestMembership.call(service, {
        userId: "user-1",
        tenantSlug: "rr",
      });

      assertEqual(
        result.result,
        "already_pending",
        "requestMembership returns already_pending for repeated request"
      );
      assertEqual(
        result.membership.status,
        "pending",
        "requestMembership preserves pending status"
      );
    }
  );

  assert(upsertCalled === false, "requestMembership does not upsert duplicate pending membership");
}

async function testRequestMembershipIsIdempotentForActiveMembership() {
  const service = new IdentityService();
  let upsertCalled = false;

  await withPatchedStorage(
    {
      getOrganizationBySlug: async () => ({
        id: "org-rr",
        slug: "rr",
        name: "Raja Rajeswari Pathasala",
      }),
      getMembershipByUserAndOrg: async () => ({
        membershipId: "membership-rr-active",
        userId: "user-1",
        orgId: "org-rr",
        orgSlug: "rr",
        orgName: "Raja Rajeswari Pathasala",
        roles: ["student"],
        status: "active",
      }),
      upsertOrgMembership: async () => {
        upsertCalled = true;
      },
    } as Partial<typeof identityStorage>,
    async () => {
      const requestMembership = (service as IdentityService & {
        requestMembership?: (data: {
          userId: string;
          tenantSlug: string;
        }) => Promise<{
          result: string;
          membership: { orgId: string; orgSlug: string; status: string };
        }>;
      }).requestMembership;

      assert(
        typeof requestMembership === "function",
        "requestMembership exists for active membership path",
        "Expected IdentityService.requestMembership to be implemented"
      );

      if (!requestMembership) {
        return;
      }

      const result = await requestMembership.call(service, {
        userId: "user-1",
        tenantSlug: "rr",
      });

      assertEqual(
        result.result,
        "already_active",
        "requestMembership returns already_active for active membership"
      );
      assertEqual(
        result.membership.status,
        "active",
        "requestMembership preserves active status"
      );
    }
  );

  assert(upsertCalled === false, "requestMembership does not upsert active membership");
}

async function testRequestMembershipDoesNotReopenInactiveMembership() {
  const service = new IdentityService();
  let upsertCalled = false;

  await withPatchedStorage(
    {
      getOrganizationBySlug: async () => ({
        id: "org-rr",
        slug: "rr",
        name: "Raja Rajeswari Pathasala",
      }),
      getMembershipByUserAndOrg: async () => ({
        membershipId: "membership-rr-inactive",
        userId: "user-1",
        orgId: "org-rr",
        orgSlug: "rr",
        orgName: "Raja Rajeswari Pathasala",
        roles: ["student"],
        status: "inactive",
      }),
      upsertOrgMembership: async () => {
        upsertCalled = true;
      },
    } as Partial<typeof identityStorage>,
    async () => {
      const requestMembership = (service as IdentityService & {
        requestMembership?: (data: {
          userId: string;
          tenantSlug: string;
        }) => Promise<{
          result: string;
          membership: { orgId: string; orgSlug: string; status: string };
        }>;
      }).requestMembership;

      assert(
        typeof requestMembership === "function",
        "requestMembership exists for inactive membership path",
        "Expected IdentityService.requestMembership to be implemented"
      );

      if (!requestMembership) {
        return;
      }

      const result = await requestMembership.call(service, {
        userId: "user-1",
        tenantSlug: "rr",
      });

      assertEqual(
        result.result,
        "inactive_membership",
        "requestMembership returns inactive_membership for inactive rows"
      );
      assertEqual(
        result.membership.status,
        "inactive",
        "requestMembership preserves inactive membership status"
      );
    }
  );

  assert(upsertCalled === false, "requestMembership does not reopen inactive membership");
}

async function testRequestMembershipDoesNotReopenRejectedMembership() {
  const service = new IdentityService();
  let upsertCalled = false;

  await withPatchedStorage(
    {
      getOrganizationBySlug: async () => ({
        id: "org-rr",
        slug: "rr",
        name: "Raja Rajeswari Pathasala",
      }),
      getMembershipByUserAndOrg: async () => ({
        membershipId: "membership-rr-rejected",
        userId: "user-1",
        orgId: "org-rr",
        orgSlug: "rr",
        orgName: "Raja Rajeswari Pathasala",
        roles: ["student"],
        status: "rejected",
      }),
      upsertOrgMembership: async () => {
        upsertCalled = true;
      },
    } as Partial<typeof identityStorage>,
    async () => {
      const requestMembership = (service as IdentityService & {
        requestMembership?: (data: {
          userId: string;
          tenantSlug: string;
        }) => Promise<{
          result: string;
          membership: { orgId: string; orgSlug: string; status: string };
        }>;
      }).requestMembership;

      assert(
        typeof requestMembership === "function",
        "requestMembership exists for rejected membership path",
        "Expected IdentityService.requestMembership to be implemented"
      );

      if (!requestMembership) {
        return;
      }

      const result = await requestMembership.call(service, {
        userId: "user-1",
        tenantSlug: "rr",
      });

      assertEqual(
        result.result,
        "rejected_membership",
        "requestMembership returns rejected_membership for rejected rows"
      );
      assertEqual(
        result.membership.status,
        "rejected",
        "requestMembership preserves rejected membership status"
      );
    }
  );

  assert(upsertCalled === false, "requestMembership does not reopen rejected membership");
}

await testRequestMembershipCreatesPendingMembership();
await testRequestMembershipIsIdempotentForPendingMembership();
await testRequestMembershipIsIdempotentForActiveMembership();
await testRequestMembershipDoesNotReopenInactiveMembership();
await testRequestMembershipDoesNotReopenRejectedMembership();

if (failed.length > 0) {
  console.error("Failed:", failed);
  process.exit(1);
}

console.log(`identity-request-membership: ${passed.length} assertions passed.`);
