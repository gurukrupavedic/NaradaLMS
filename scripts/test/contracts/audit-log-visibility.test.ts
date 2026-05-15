import { AdminService } from "../../../server/modules/system-admin/service";
import type { AdminStorage } from "../../../server/modules/system-admin/storage";
import { getAuditLogVisibilityFilter } from "../../../server/routes/admin.routes";

const passed: string[] = [];
const failed: { name: string; error: string }[] = [];

function assert(condition: boolean, name: string, message?: string) {
  if (condition) {
    passed.push(name);
  } else {
    failed.push({ name, error: message ?? "Assertion failed" });
  }
}

function assertEqual<T>(actual: T, expected: T, name: string) {
  assert(
    actual === expected,
    name,
    `Expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`
  );
}

function assertDeepEqual(actual: unknown, expected: unknown, name: string) {
  assertEqual(JSON.stringify(actual), JSON.stringify(expected), name);
}

function testOrgAdminVisibilityScope() {
  const filters = getAuditLogVisibilityFilter({
    isSuperAdmin: false,
    orgId: "org-1",
  });

  assertDeepEqual(
    filters,
    {
      scope: "org",
      orgId: "org-1",
    },
    "org admin audit visibility is scoped to current org"
  );
}

function testOrgAdminWithoutOrgContextThrows() {
  let errorMessage = "";

  try {
    getAuditLogVisibilityFilter({
      isSuperAdmin: false,
      orgId: undefined,
    });
  } catch (error) {
    errorMessage = error instanceof Error ? error.message : String(error);
  }

  assertEqual(
    errorMessage,
    "Organization context is required for org-scoped audit logs",
    "org admin audit visibility requires org context"
  );
}

function testSuperAdminVisibilityScope() {
  const filters = getAuditLogVisibilityFilter({
    isSuperAdmin: true,
    orgId: "org-2",
  });

  assertDeepEqual(filters, {}, "super-admin audit visibility is unrestricted");
}

async function testAdminServiceForwardsVisibilityFilters() {
  let receivedFilters: unknown;
  const fakeStorage = {
    getAuditLogs: async (filters: unknown) => {
      receivedFilters = filters;
      return { rows: [], total: 0 };
    },
  } as unknown as AdminStorage;

  const service = new AdminService(fakeStorage);

  await service.getAuditLogs({
    action: "MEMBERSHIP_APPROVED",
    scope: "org",
    orgId: "org-3",
    limit: 25,
    offset: 10,
  });

  assertDeepEqual(
    receivedFilters,
    {
      userId: undefined,
      action: "MEMBERSHIP_APPROVED",
      resourceType: undefined,
      startDate: undefined,
      endDate: undefined,
      scope: "org",
      orgId: "org-3",
      limit: 25,
      offset: 10,
    },
    "AdminService forwards audit visibility filters to storage"
  );
}

testOrgAdminVisibilityScope();
testOrgAdminWithoutOrgContextThrows();
testSuperAdminVisibilityScope();
await testAdminServiceForwardsVisibilityFilters();

if (failed.length > 0) {
  console.error("Failed:", failed);
  process.exit(1);
}

console.log(`audit-log-visibility: ${passed.length} assertions passed.`);
