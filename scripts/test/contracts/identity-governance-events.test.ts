import { IdentityService } from "../../../server/modules/identity-access/service";
import { identityStorage } from "../../../server/modules/identity-access/storage";
import { initializeEventHandlers } from "../../../server/modules/system-admin/events";
import { initAdminService } from "../../../server/modules/system-admin/service";
import type { AdminStorage } from "../../../server/modules/system-admin/storage";
import { eventBus } from "../../../server/shared/events/event-bus";

type AsyncVoid = () => Promise<void>;

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

function assertDate(value: unknown, name: string) {
  assert(
    value instanceof Date && !Number.isNaN(value.getTime()),
    name,
    `Expected a valid Date, got ${String(value)}`
  );
}

async function runTest(name: string, fn: AsyncVoid) {
  try {
    await fn();
  } catch (error) {
    failed.push({
      name,
      error: error instanceof Error ? error.message : String(error),
    });
  } finally {
    eventBus.clear();
  }
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

async function captureEvent<T>(eventType: string, fn: AsyncVoid): Promise<T | undefined> {
  let captured: T | undefined;
  eventBus.subscribe<T>(eventType, (event) => {
    captured = event;
  });
  await fn();
  return captured;
}

async function testApproveMembershipEventContract() {
  const service = new IdentityService();
  const membershipRow = {
    membershipId: "membership-1",
    userId: "user-1",
    orgId: "org-1",
    orgSlug: "slmts",
    roles: ["student"],
    status: "pending",
  };

  await withPatchedStorage(
    {
      getMembershipWithUserOrg: async () => membershipRow,
      updateMembershipRecord: async () => undefined,
    },
    async () => {
      const event = await captureEvent<{
        type: string;
        membershipId: string;
        targetUserId: string;
        actorUserId: string;
        orgId: string;
        timestamp: Date;
      }>("MembershipApproved", async () => {
        await service.approveMembership("membership-1", "actor-1");
      });

      assert(Boolean(event), "approveMembership publishes MembershipApproved");
      assertEqual(event?.type, "MembershipApproved", "approveMembership event type");
      assertEqual(event?.membershipId, "membership-1", "approveMembership membership id");
      assertEqual(event?.targetUserId, "user-1", "approveMembership target user");
      assertEqual(event?.actorUserId, "actor-1", "approveMembership actor user");
      assertEqual(event?.orgId, "org-1", "approveMembership org");
      assertDate(event?.timestamp, "approveMembership timestamp");
    }
  );
}

async function testSetMembershipActiveFlagPublishesMembershipDisabled() {
  const service = new IdentityService();
  const membershipRow = {
    membershipId: "membership-2",
    userId: "user-2",
    orgId: "org-2",
    orgSlug: "rr",
    roles: ["student", "admin"],
    status: "active",
  };

  await withPatchedStorage(
    {
      getMembershipWithUserOrg: async () => membershipRow,
      updateMembershipRecord: async () => undefined,
    },
    async () => {
      const event = await captureEvent<{
        type: string;
        membershipId: string;
        targetUserId: string;
        actorUserId: string;
        orgId: string;
        status: string;
        timestamp: Date;
      }>("MembershipDisabled", async () => {
        await service.setMembershipActiveFlag("membership-2", "inactive", "actor-2");
      });

      assert(Boolean(event), "setMembershipActiveFlag publishes MembershipDisabled");
      assertEqual(event?.type, "MembershipDisabled", "MembershipDisabled event type");
      assertEqual(event?.membershipId, "membership-2", "MembershipDisabled membership id");
      assertEqual(event?.targetUserId, "user-2", "MembershipDisabled target user");
      assertEqual(event?.actorUserId, "actor-2", "MembershipDisabled actor user");
      assertEqual(event?.orgId, "org-2", "MembershipDisabled org");
      assertEqual(event?.status, "inactive", "MembershipDisabled status");
      assertDate(event?.timestamp, "MembershipDisabled timestamp");
    }
  );
}

async function testSetMembershipActiveFlagPublishesMembershipEnabled() {
  const service = new IdentityService();
  const membershipRow = {
    membershipId: "membership-2b",
    userId: "user-2b",
    orgId: "org-2b",
    orgSlug: "rr",
    roles: ["student"],
    status: "inactive",
  };

  await withPatchedStorage(
    {
      getMembershipWithUserOrg: async () => membershipRow,
      updateMembershipRecord: async () => undefined,
    },
    async () => {
      const event = await captureEvent<{
        type: string;
        membershipId: string;
        targetUserId: string;
        actorUserId: string;
        orgId: string;
        status: string;
        timestamp: Date;
      }>("MembershipEnabled", async () => {
        await service.setMembershipActiveFlag("membership-2b", "active", "actor-2b");
      });

      assert(Boolean(event), "setMembershipActiveFlag publishes MembershipEnabled");
      assertEqual(event?.type, "MembershipEnabled", "MembershipEnabled event type");
      assertEqual(event?.membershipId, "membership-2b", "MembershipEnabled membership id");
      assertEqual(event?.targetUserId, "user-2b", "MembershipEnabled target user");
      assertEqual(event?.actorUserId, "actor-2b", "MembershipEnabled actor user");
      assertEqual(event?.orgId, "org-2b", "MembershipEnabled org");
      assertEqual(event?.status, "active", "MembershipEnabled status");
      assertDate(event?.timestamp, "MembershipEnabled timestamp");
    }
  );
}

async function testSetMembershipRolesPublishesMembershipRolesChanged() {
  const service = new IdentityService();
  const membershipRow = {
    membershipId: "membership-3",
    userId: "user-3",
    orgId: "org-3",
    orgSlug: "slmts",
    roles: ["student"],
    status: "active",
  };

  await withPatchedStorage(
    {
      getMembershipWithUserOrg: async () => membershipRow,
      updateMembershipRecord: async () => undefined,
    },
    async () => {
      const event = await captureEvent<{
        type: string;
        membershipId: string;
        targetUserId: string;
        actorUserId: string;
        orgId: string;
        roles: string[];
        timestamp: Date;
      }>("MembershipRolesChanged", async () => {
        await service.setMembershipRoles(
          "membership-3",
          ["student", "instructor"],
          "actor-3"
        );
      });

      assert(Boolean(event), "setMembershipRoles publishes MembershipRolesChanged");
      assertEqual(event?.type, "MembershipRolesChanged", "MembershipRolesChanged event type");
      assertEqual(event?.membershipId, "membership-3", "MembershipRolesChanged membership id");
      assertEqual(event?.targetUserId, "user-3", "MembershipRolesChanged target user");
      assertEqual(event?.actorUserId, "actor-3", "MembershipRolesChanged actor user");
      assertEqual(event?.orgId, "org-3", "MembershipRolesChanged org");
      assertEqual(
        JSON.stringify(event?.roles),
        JSON.stringify(["student", "instructor"]),
        "MembershipRolesChanged roles"
      );
      assertDate(event?.timestamp, "MembershipRolesChanged timestamp");
    }
  );
}

async function testGrantSuperAdminEventContract() {
  const service = new IdentityService();

  await withPatchedStorage(
    {
      getUser: async () => ({
        id: "user-4",
        email: "user4@example.com",
        isSuperAdmin: false,
      }),
      setUserIsSuperAdmin: async () => undefined,
    },
    async () => {
      const event = await captureEvent<{
        type: string;
        targetUserId: string;
        actorUserId: string;
        timestamp: Date;
      }>("SuperAdminGranted", async () => {
        await service.grantSuperAdmin("user-4", "actor-4");
      });

      assert(Boolean(event), "grantSuperAdmin publishes SuperAdminGranted");
      assertEqual(event?.type, "SuperAdminGranted", "SuperAdminGranted event type");
      assertEqual(event?.targetUserId, "user-4", "SuperAdminGranted target user");
      assertEqual(event?.actorUserId, "actor-4", "SuperAdminGranted actor user");
      assertDate(event?.timestamp, "SuperAdminGranted timestamp");
      assertEqual(
        Object.prototype.hasOwnProperty.call(event ?? {}, "orgId"),
        false,
        "SuperAdminGranted omits orgId"
      );
    }
  );
}

async function testRejectMembershipEventContract() {
  const service = new IdentityService();
  const membershipRow = {
    membershipId: "membership-4",
    userId: "user-4",
    orgId: "org-4",
    orgSlug: "slmts",
    roles: ["student"],
    status: "pending",
  };

  await withPatchedStorage(
    {
      getMembershipWithUserOrg: async () => membershipRow,
      updateMembershipRecord: async () => undefined,
    },
    async () => {
      const event = await captureEvent<{
        type: string;
        membershipId: string;
        targetUserId: string;
        actorUserId: string;
        orgId: string;
        timestamp: Date;
      }>("MembershipRejected", async () => {
        await service.rejectMembership("membership-4", "actor-4");
      });

      assert(Boolean(event), "rejectMembership publishes MembershipRejected");
      assertEqual(event?.type, "MembershipRejected", "MembershipRejected event type");
      assertEqual(event?.membershipId, "membership-4", "MembershipRejected membership id");
      assertEqual(event?.targetUserId, "user-4", "MembershipRejected target user");
      assertEqual(event?.actorUserId, "actor-4", "MembershipRejected actor user");
      assertEqual(event?.orgId, "org-4", "MembershipRejected org");
      assertDate(event?.timestamp, "MembershipRejected timestamp");
    }
  );
}

async function testRevokeSuperAdminEventContract() {
  const service = new IdentityService();

  await withPatchedStorage(
    {
      getUser: async () => ({
        id: "user-6",
        email: "user6@example.com",
        isSuperAdmin: true,
      }),
      countSuperAdminUsers: async () => 2,
      setUserIsSuperAdmin: async () => undefined,
    },
    async () => {
      const event = await captureEvent<{
        type: string;
        targetUserId: string;
        actorUserId: string;
        timestamp: Date;
      }>("SuperAdminRevoked", async () => {
        await service.revokeSuperAdmin("user-6", "actor-6");
      });

      assert(Boolean(event), "revokeSuperAdmin publishes SuperAdminRevoked");
      assertEqual(event?.type, "SuperAdminRevoked", "SuperAdminRevoked event type");
      assertEqual(event?.targetUserId, "user-6", "SuperAdminRevoked target user");
      assertEqual(event?.actorUserId, "actor-6", "SuperAdminRevoked actor user");
      assertDate(event?.timestamp, "SuperAdminRevoked timestamp");
      assertEqual(
        Object.prototype.hasOwnProperty.call(event ?? {}, "orgId"),
        false,
        "SuperAdminRevoked omits orgId"
      );
    }
  );
}

async function testAuditSubscriberLogsMembershipApproved() {
  const auditCalls: Array<{
    userId: string;
    action: string;
    resourceType: string;
    resourceId: string;
    changes?: unknown;
  }> = [];

  const fakeStorage = {
    insertAuditLog: async (
      userId: string,
      action: string,
      resourceType: string,
      resourceId: string,
      changes?: unknown
    ) => {
      auditCalls.push({ userId, action, resourceType, resourceId, changes });
    },
  } as unknown as AdminStorage;

  initAdminService(fakeStorage);
  initializeEventHandlers();

  await eventBus.publish("MembershipApproved", {
    type: "MembershipApproved",
    membershipId: "membership-5",
    targetUserId: "user-5",
    actorUserId: "actor-5",
    orgId: "org-5",
    timestamp: new Date("2026-05-11T12:00:00.000Z"),
  });

  assertEqual(auditCalls.length, 1, "MembershipApproved audit handler writes one log");
  assertEqual(auditCalls[0]?.userId, "actor-5", "MembershipApproved audit actor");
  assertEqual(
    auditCalls[0]?.action,
    "MEMBERSHIP_APPROVED",
    "MembershipApproved audit action"
  );
  assertEqual(
    auditCalls[0]?.resourceType,
    "user_membership",
    "MembershipApproved audit resource type"
  );
  assertEqual(
    auditCalls[0]?.resourceId,
    "membership-5",
    "MembershipApproved audit resource id"
  );
  assertEqual(
    JSON.stringify(auditCalls[0]?.changes),
    JSON.stringify({
      targetUserId: "user-5",
      orgId: "org-5",
      scope: "org",
      approvedAt: new Date("2026-05-11T12:00:00.000Z"),
    }),
    "MembershipApproved audit metadata"
  );
}

async function testAuditSubscriberLogsSuperAdminGrantedAsPlatformScoped() {
  const auditCalls: Array<{
    userId: string;
    action: string;
    resourceType: string;
    resourceId: string;
    changes?: unknown;
  }> = [];

  const fakeStorage = {
    insertAuditLog: async (
      userId: string,
      action: string,
      resourceType: string,
      resourceId: string,
      changes?: unknown
    ) => {
      auditCalls.push({ userId, action, resourceType, resourceId, changes });
    },
  } as unknown as AdminStorage;

  initAdminService(fakeStorage);
  initializeEventHandlers();

  await eventBus.publish("SuperAdminGranted", {
    type: "SuperAdminGranted",
    targetUserId: "user-7",
    actorUserId: "actor-7",
    timestamp: new Date("2026-05-11T12:30:00.000Z"),
  });

  assertEqual(auditCalls.length, 1, "SuperAdminGranted audit handler writes one log");
  assertEqual(auditCalls[0]?.userId, "actor-7", "SuperAdminGranted audit actor");
  assertEqual(
    auditCalls[0]?.action,
    "SUPER_ADMIN_GRANTED",
    "SuperAdminGranted audit action"
  );
  assertEqual(auditCalls[0]?.resourceType, "user", "SuperAdminGranted resource type");
  assertEqual(auditCalls[0]?.resourceId, "user-7", "SuperAdminGranted resource id");
  assertEqual(
    JSON.stringify(auditCalls[0]?.changes),
    JSON.stringify({
      targetUserId: "user-7",
      scope: "platform",
      grantedAt: new Date("2026-05-11T12:30:00.000Z"),
    }),
    "SuperAdminGranted audit metadata"
  );
}

await runTest(
  "approveMembership uses the aligned governance event contract",
  testApproveMembershipEventContract
);
await runTest(
  "setMembershipActiveFlag publishes MembershipDisabled when deactivating",
  testSetMembershipActiveFlagPublishesMembershipDisabled
);
await runTest(
  "setMembershipActiveFlag publishes MembershipEnabled when reactivating",
  testSetMembershipActiveFlagPublishesMembershipEnabled
);
await runTest(
  "setMembershipRoles publishes MembershipRolesChanged with actor and target ids",
  testSetMembershipRolesPublishesMembershipRolesChanged
);
await runTest(
  "rejectMembership uses the aligned governance event contract",
  testRejectMembershipEventContract
);
await runTest(
  "grantSuperAdmin publishes a platform-scoped event without orgId",
  testGrantSuperAdminEventContract
);
await runTest(
  "revokeSuperAdmin publishes a platform-scoped event without orgId",
  testRevokeSuperAdminEventContract
);
await runTest(
  "MembershipApproved audit logging follows the new governance mapping",
  testAuditSubscriberLogsMembershipApproved
);
await runTest(
  "SuperAdminGranted audit logging follows the platform governance mapping",
  testAuditSubscriberLogsSuperAdminGrantedAsPlatformScoped
);

if (failed.length > 0) {
  console.error("Failed:", failed);
  process.exit(1);
}

console.log(`identity-governance-events: ${passed.length} assertions passed.`);
