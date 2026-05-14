import type { MembershipSummary } from "../../apps/admin-portal/src/hooks/useAuth";
import * as orgSwitcherModule from "../../apps/admin-portal/src/lib/org-switcher";

const {
  getAdminSwitcherMemberships,
  getCurrentAdminMembership,
  isOrgScopedAdminQueryKey,
} = (
  "default" in orgSwitcherModule
    ? (orgSwitcherModule.default as typeof orgSwitcherModule)
    : orgSwitcherModule
) as {
  getAdminSwitcherMemberships: (
    memberships: MembershipSummary[],
    isSuperAdmin: boolean
  ) => MembershipSummary[];
  getCurrentAdminMembership: (
    memberships: MembershipSummary[],
    currentOrgId?: string
  ) => MembershipSummary | null;
  isOrgScopedAdminQueryKey: (queryKey: readonly unknown[]) => boolean;
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

const memberships: MembershipSummary[] = [
  {
    membershipId: "membership-1",
    orgId: "org-slmts",
    orgSlug: "slmts",
    orgName: "SLMTS",
    roles: ["student", "admin"],
    status: "active",
  },
  {
    membershipId: "membership-2",
    orgId: "org-rr",
    orgSlug: "rr",
    orgName: "RR",
    roles: ["student"],
    status: "active",
  },
  {
    membershipId: "membership-3",
    orgId: "org-pending",
    orgSlug: "pending",
    orgName: "Pending Org",
    roles: ["student", "admin"],
    status: "pending",
  },
];

function testOrgAdminOnlySeesActiveAdminMemberships() {
  const result = getAdminSwitcherMemberships(memberships, false);

  assertEqual(result.length, 1, "org admin only sees active admin memberships");
  assertEqual(
    result[0]?.orgId,
    "org-slmts",
    "org admin membership list keeps active admin org"
  );
}

function testSuperAdminSeesAllActiveMemberships() {
  const result = getAdminSwitcherMemberships(memberships, true);

  assertEqual(result.length, 2, "super admin sees all active memberships");
  assertEqual(result[1]?.orgId, "org-rr", "super admin keeps second active org");
}

function testCurrentMembershipMatchesCurrentOrgId() {
  const switchableMemberships = getAdminSwitcherMemberships(memberships, true);
  const current = getCurrentAdminMembership(switchableMemberships, "org-rr");

  assertEqual(current?.orgId, "org-rr", "current membership resolves by currentOrgId");
}

function testCurrentMembershipFallsBackToFirstSwitchableOrg() {
  const switchableMemberships = getAdminSwitcherMemberships(memberships, false);
  const current = getCurrentAdminMembership(
    switchableMemberships,
    "missing-org"
  );

  assertEqual(
    current?.orgId,
    "org-slmts",
    "current membership falls back to first switchable org"
  );
}

function testQueryKeyPredicateMatchesOrgScopedAdminData() {
  assert(
    isOrgScopedAdminQueryKey(["audit-logs", { limit: 25 }]),
    "matches audit logs"
  );
  assert(
    isOrgScopedAdminQueryKey(["content", "tracks"]),
    "matches content prefix"
  );
  assert(
    isOrgScopedAdminQueryKey(["/content/tracks"]),
    "matches string content query"
  );
  assert(
    isOrgScopedAdminQueryKey(["batches", 50, 0, "/batches"]),
    "matches batches list"
  );
  assert(
    isOrgScopedAdminQueryKey(["/batches/2/enrollments"]),
    "matches batch relations"
  );
  assert(
    isOrgScopedAdminQueryKey(["instructors", "/admin/directory/users"]),
    "matches instructor directory query"
  );
  assert(
    isOrgScopedAdminQueryKey([
      "/admin/directory/users?membershipRole=student&limit=200",
    ]),
    "matches student directory query"
  );
}

function testQueryKeyPredicateSkipsGlobalGovernanceQueries() {
  assert(
    !isOrgScopedAdminQueryKey(["admin-users", { limit: 25, offset: 0 }]),
    "skips global admin users"
  );
  assert(
    !isOrgScopedAdminQueryKey(["auth", "me"]),
    "skips auth query handled separately"
  );
  assert(
    !isOrgScopedAdminQueryKey(["studentTrackProgress", "student-1"]),
    "skips unrelated student query"
  );
}

testOrgAdminOnlySeesActiveAdminMemberships();
testSuperAdminSeesAllActiveMemberships();
testCurrentMembershipMatchesCurrentOrgId();
testCurrentMembershipFallsBackToFirstSwitchableOrg();
testQueryKeyPredicateMatchesOrgScopedAdminData();
testQueryKeyPredicateSkipsGlobalGovernanceQueries();

if (failed.length > 0) {
  console.error("Failed:", failed);
  process.exit(1);
}

console.log(`admin-org-switcher-utils: ${passed.length} assertions passed.`);
