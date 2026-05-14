type MembershipSummary = {
  membershipId: string;
  orgId: string;
  orgSlug: "slmts" | "rr";
  orgName: string;
  roles: string[];
  status: "pending" | "active" | "inactive" | "rejected";
};

type AuthSession = {
  currentOrgId?: string;
  memberships: MembershipSummary[];
  hasActiveMembership: boolean;
  isSuperAdmin: boolean;
};

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

async function run() {
  let sessionModule: Record<string, unknown> | null = null;

  try {
    sessionModule = (await import(
      "../../apps/student-portal/src/lib/tenant-session"
    )) as Record<string, unknown>;
  } catch (error) {
    failed.push({
      name: "tenant-session module exists",
      error:
        error instanceof Error
          ? error.message
          : "Expected tenant-session helper module to exist",
    });
  }

  if (!sessionModule) {
    if (failed.length > 0) {
      console.error("Failed:", failed);
      process.exit(1);
    }
    return;
  }

  const getCurrentTenantMembership = sessionModule
    .getCurrentTenantMembership as
    | undefined
    | ((session: AuthSession, tenantSlug: "slmts" | "rr") => MembershipSummary | null);
  const getTenantAccessState = sessionModule.getTenantAccessState as
    | undefined
    | ((
        session: AuthSession,
        tenantSlug: "slmts" | "rr"
      ) => "active" | "pending" | "needs_membership" | "inactive" | "rejected");
  const getTenantSwitchOrgId = sessionModule.getTenantSwitchOrgId as
    | undefined
    | ((
        session: AuthSession,
        tenantSlug: "slmts" | "rr",
        failedOrgId?: string | null
      ) => string | null);

  assert(
    typeof getCurrentTenantMembership === "function",
    "getCurrentTenantMembership exists"
  );
  assert(typeof getTenantAccessState === "function", "getTenantAccessState exists");
  assert(typeof getTenantSwitchOrgId === "function", "getTenantSwitchOrgId exists");

  if (!getCurrentTenantMembership || !getTenantAccessState || !getTenantSwitchOrgId) {
    if (failed.length > 0) {
      console.error("Failed:", failed);
      process.exit(1);
    }
    return;
  }

  const pendingRrSession: AuthSession = {
    currentOrgId: "org-slmts",
    hasActiveMembership: true,
    isSuperAdmin: false,
    memberships: [
      {
        membershipId: "membership-slmts",
        orgId: "org-slmts",
        orgSlug: "slmts",
        orgName: "Sri Lalita Maha Tripura Sundari Pathasala",
        roles: ["student"],
        status: "active",
      },
      {
        membershipId: "membership-rr",
        orgId: "org-rr",
        orgSlug: "rr",
        orgName: "Sri Raja Rajeswari Pathasala",
        roles: ["student"],
        status: "pending",
      },
    ],
  };

  const activeRrWrongContext: AuthSession = {
    currentOrgId: "org-slmts",
    hasActiveMembership: true,
    isSuperAdmin: false,
    memberships: [
      {
        membershipId: "membership-slmts",
        orgId: "org-slmts",
        orgSlug: "slmts",
        orgName: "Sri Lalita Maha Tripura Sundari Pathasala",
        roles: ["student"],
        status: "active",
      },
      {
        membershipId: "membership-rr",
        orgId: "org-rr",
        orgSlug: "rr",
        orgName: "Sri Raja Rajeswari Pathasala",
        roles: ["student"],
        status: "active",
      },
    ],
  };

  const noRrMembership: AuthSession = {
    currentOrgId: "org-slmts",
    hasActiveMembership: true,
    isSuperAdmin: false,
    memberships: [
      {
        membershipId: "membership-slmts",
        orgId: "org-slmts",
        orgSlug: "slmts",
        orgName: "Sri Lalita Maha Tripura Sundari Pathasala",
        roles: ["student"],
        status: "active",
      },
    ],
  };

  const rrMembership = getCurrentTenantMembership(pendingRrSession, "rr");
  assertEqual(rrMembership?.orgId, "org-rr", "current tenant membership resolves rr membership");
  assertEqual(
    getTenantAccessState(pendingRrSession, "rr"),
    "pending",
    "tenant access state is pending when rr is pending but another org is active"
  );
  assertEqual(
    getTenantAccessState(noRrMembership, "rr"),
    "needs_membership",
    "tenant access state requires membership when rr membership is missing"
  );
  assertEqual(
    getTenantSwitchOrgId(activeRrWrongContext, "rr"),
    "org-rr",
    "tenant switch target prefers rr org when rr is active but current context is different"
  );
  assertEqual(
    getTenantSwitchOrgId(pendingRrSession, "rr"),
    null,
    "tenant switch target stays null for pending rr membership"
  );
  assertEqual(
    getTenantSwitchOrgId(activeRrWrongContext, "rr", "org-rr"),
    null,
    "tenant switch target stays null after a failed switch to the same org"
  );

  if (failed.length > 0) {
    console.error("Failed:", failed);
    process.exit(1);
  }

  console.log(`student-tenant-session: ${passed.length} assertions passed.`);
}

await run();
