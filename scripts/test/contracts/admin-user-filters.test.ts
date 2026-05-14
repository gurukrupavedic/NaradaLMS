import * as adminUserFiltersModule from "../../apps/admin-portal/src/lib/admin-user-filters";

const { ADMIN_USER_ORG_FILTER_OPTIONS, buildAdminUsersSearchParams } = (
  "default" in adminUserFiltersModule
    ? (adminUserFiltersModule.default as typeof adminUserFiltersModule)
    : adminUserFiltersModule
) as {
  ADMIN_USER_ORG_FILTER_OPTIONS: {
    value: string;
    label: string;
  }[];
  buildAdminUsersSearchParams: (
    params: {
      limit: number;
      offset: number;
      status?: string;
      search?: string;
      orgSlug?: string;
    }
  ) => URLSearchParams;
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

function testOrgFilterOptionsCoverAllSeededTenants() {
  assertEqual(
    ADMIN_USER_ORG_FILTER_OPTIONS.length,
    3,
    "org filter options include all organizations plus seeded tenants"
  );
  assertEqual(
    ADMIN_USER_ORG_FILTER_OPTIONS[0]?.value,
    "all",
    "org filter starts with all organizations option"
  );
  assertEqual(
    ADMIN_USER_ORG_FILTER_OPTIONS[1]?.value,
    "slmts",
    "org filter includes slmts option"
  );
  assertEqual(
    ADMIN_USER_ORG_FILTER_OPTIONS[2]?.value,
    "rr",
    "org filter includes rr option"
  );
}

function testBuildAdminUsersSearchParamsOmitsAllOrgFilter() {
  const searchParams = buildAdminUsersSearchParams({
    limit: 25,
    offset: 0,
    orgSlug: "all",
  });

  assertEqual(
    searchParams.get("orgSlug"),
    null,
    "all organizations does not serialize orgSlug"
  );
}

function testBuildAdminUsersSearchParamsSerializesOrgSlugAndSearch() {
  const searchParams = buildAdminUsersSearchParams({
    limit: 50,
    offset: 25,
    search: "  kashyap@example.com ",
    orgSlug: "rr",
  });

  assertEqual(searchParams.get("limit"), "50", "limit is serialized");
  assertEqual(searchParams.get("offset"), "25", "offset is serialized");
  assertEqual(
    searchParams.get("search"),
    "kashyap@example.com",
    "search is trimmed before serialization"
  );
  assertEqual(
    searchParams.get("orgSlug"),
    "rr",
    "org slug is serialized for tenant filtering"
  );
}

function testBuildAdminUsersSearchParamsMapsPendingTabToMembershipStatus() {
  const searchParams = buildAdminUsersSearchParams({
    limit: 25,
    offset: 0,
    status: "pending",
    orgSlug: "slmts",
  });

  assertEqual(
    searchParams.get("membershipStatus"),
    "pending",
    "pending tab maps to membership status"
  );
  assertEqual(
    searchParams.get("orgSlug"),
    "slmts",
    "status and org filters can be combined"
  );
}

testOrgFilterOptionsCoverAllSeededTenants();
testBuildAdminUsersSearchParamsOmitsAllOrgFilter();
testBuildAdminUsersSearchParamsSerializesOrgSlugAndSearch();
testBuildAdminUsersSearchParamsMapsPendingTabToMembershipStatus();

if (failed.length > 0) {
  console.error("Failed:", failed);
  process.exit(1);
}

console.log(`admin-user-filters: ${passed.length} assertions passed.`);
