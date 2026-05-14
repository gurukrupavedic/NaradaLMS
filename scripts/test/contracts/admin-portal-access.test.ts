import { canAccessAdminPortal } from "../../../server/modules/identity-access/admin-portal-access";

const passed: string[] = [];
const failed: { name: string; error: string }[] = [];

function assert(condition: boolean, name: string, message?: string) {
  if (condition) {
    passed.push(name);
    return;
  }
  failed.push({ name, error: message ?? "Assertion failed" });
}

/** Slice 1 acceptance: admin only on RR while JWT default org could be SLMTS. */
function testAdminInNonDefaultOrgStillTrue() {
  const actual = canAccessAdminPortal({
    isSuperAdmin: false,
    memberships: [
      {
        status: "active",
        roles: ["student"],
      },
      {
        status: "active",
        roles: ["admin"],
      },
    ],
  });
  assert(actual === true, "active admin in any org grants portal access");
}

/** Slice 1 acceptance: student-only non–super-admin. */
function testStudentOnlyFalse() {
  const actual = canAccessAdminPortal({
    isSuperAdmin: false,
    memberships: [
      { status: "active", roles: ["student"] },
      { status: "active", roles: ["student", "instructor"] },
    ],
  });
  assert(actual === false, "student/instructor without admin is denied");
}

function testSuperAdminWithoutMembership() {
  const actual = canAccessAdminPortal({
    isSuperAdmin: true,
    memberships: [],
  });
  assert(actual === true, "super admin may open admin portal without org admin");
}

function testInactiveAdminDenied() {
  const actual = canAccessAdminPortal({
    isSuperAdmin: false,
    memberships: [{ status: "inactive", roles: ["admin"] }],
  });
  assert(actual === false, "inactive admin membership does not grant access");
}

function testPendingAdminDenied() {
  const actual = canAccessAdminPortal({
    isSuperAdmin: false,
    memberships: [{ status: "pending", roles: ["admin"] }],
  });
  assert(actual === false, "pending admin membership does not grant access");
}

testAdminInNonDefaultOrgStillTrue();
testStudentOnlyFalse();
testSuperAdminWithoutMembership();
testInactiveAdminDenied();
testPendingAdminDenied();

if (failed.length > 0) {
  console.error("Failed:", failed);
  process.exit(1);
}

console.log(`admin-portal-access: ${passed.length} assertions passed.`);
