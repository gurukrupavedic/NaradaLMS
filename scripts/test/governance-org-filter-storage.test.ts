import { identityService } from "../../server/modules/identity-access/service";
import { identityStorage } from "../../server/modules/identity-access/storage";

const passed: string[] = [];
const failed: { name: string; error: string }[] = [];

function assert(condition: boolean, name: string, message?: string) {
  if (condition) {
    passed.push(name);
    return;
  }

  failed.push({ name, error: message ?? "Assertion failed" });
}

async function testGovernanceUserIdsSupportOrgSlugFilter() {
  const slmts = await identityStorage.listGovernanceUserIdsPaginated(25, 0, {
    orgSlug: "slmts",
  });
  const rr = await identityStorage.listGovernanceUserIdsPaginated(25, 0, {
    orgSlug: "rr",
  });

  assert(
    Array.isArray(slmts.ids),
    "slmts org filter returns an ids array",
    "Expected listGovernanceUserIdsPaginated to return ids for slmts filter"
  );
  assert(
    Array.isArray(rr.ids),
    "rr org filter returns an ids array",
    "Expected listGovernanceUserIdsPaginated to return ids for rr filter"
  );
  assert(
    typeof slmts.total === "number",
    "slmts org filter returns a numeric total",
    "Expected listGovernanceUserIdsPaginated to return a numeric total for slmts"
  );
  assert(
    typeof rr.total === "number",
    "rr org filter returns a numeric total",
    "Expected listGovernanceUserIdsPaginated to return a numeric total for rr"
  );
}

async function testGovernanceStatusCountsRespectOrgSlugFilter() {
  const allUsers = await identityService.listGovernanceUsers(25, 0);
  const slmtsUsers = await identityService.listGovernanceUsers(25, 0, {
    orgSlug: "slmts",
  });
  const rrUsers = await identityService.listGovernanceUsers(25, 0, {
    orgSlug: "rr",
  });

  assert(
    slmtsUsers.statusCounts.all <= allUsers.statusCounts.all,
    "slmts filtered counts do not exceed global counts",
    "Expected slmts-filtered tab counts to be scoped at or below the global counts"
  );
  assert(
    rrUsers.statusCounts.all <= allUsers.statusCounts.all,
    "rr filtered counts do not exceed global counts",
    "Expected rr-filtered tab counts to be scoped at or below the global counts"
  );
  assert(
    slmtsUsers.statusCounts.all === slmtsUsers.total,
    "slmts filtered tab count matches filtered total",
    "Expected slmts filtered all-count to match filtered total"
  );
  assert(
    rrUsers.statusCounts.all === rrUsers.total,
    "rr filtered tab count matches filtered total",
    "Expected rr filtered all-count to match filtered total"
  );
}

await testGovernanceUserIdsSupportOrgSlugFilter();
await testGovernanceStatusCountsRespectOrgSlugFilter();

if (failed.length > 0) {
  console.error("Failed:", failed);
  process.exit(1);
}

console.log(`governance-org-filter-storage: ${passed.length} assertions passed.`);
