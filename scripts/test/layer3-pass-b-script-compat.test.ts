import { readFileSync } from "node:fs";
import { join } from "node:path";

const passed: string[] = [];
const failed: { name: string; error: string }[] = [];

function assert(condition: boolean, name: string, message?: string) {
  if (condition) {
    passed.push(name);
  } else {
    failed.push({ name, error: message ?? "Assertion failed" });
  }
}

function readScript(relativePath: string) {
  return readFileSync(join(process.cwd(), relativePath), "utf8");
}

function testFullProficiencyResetCompatibility() {
  const source = readScript("scripts/utils/full-proficiency-reset.ts");

  assert(
    source.includes("userOrganizations"),
    "full proficiency reset reads tenant memberships",
    "full-proficiency-reset should source students from active org memberships"
  );
  assert(
    source.includes("chapters.orgId"),
    "full proficiency reset scopes chapters by org",
    "full-proficiency-reset should use chapter org context"
  );
  assert(
    source.includes("orgId:"),
    "full proficiency reset inserts orgId on student progress rows",
    "full-proficiency-reset should populate orgId when inserting student progress"
  );
}

function testCheckAndResetCompatibility() {
  const source = readScript("scripts/utils/check-and-reset-proficiency.ts");

  assert(
    source.includes("enrollments.orgId"),
    "check-and-reset proficiency reads enrollment org scope",
    "check-and-reset-proficiency should source orgId from active enrollments"
  );
  assert(
    source.includes("chapters.orgId"),
    "check-and-reset proficiency scopes chapters by org",
    "check-and-reset-proficiency should use chapter org context"
  );
  assert(
    source.includes("orgId:"),
    "check-and-reset proficiency inserts orgId on student progress rows",
    "check-and-reset-proficiency should populate orgId when inserting student progress"
  );
}

testFullProficiencyResetCompatibility();
testCheckAndResetCompatibility();

if (failed.length > 0) {
  console.error("Failed:", failed);
  process.exit(1);
}

console.log(`layer3-pass-b-script-compat: ${passed.length} assertions passed.`);
