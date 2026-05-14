import { tracks, chapters, batches, enrollments } from "../../packages/types/src/schema";
import { contentRouter } from "../../../server/routes/content.routes";
import { batchRouter } from "../../../server/routes/batch.routes";
import { learningRouter } from "../../../server/routes/learning.routes";
import { studentRouter } from "../../../server/routes/student.routes";

type Layer = {
  name?: string;
};

const passed: string[] = [];
const failed: { name: string; error: string }[] = [];

function assert(condition: boolean, name: string, message?: string) {
  if (condition) {
    passed.push(name);
  } else {
    failed.push({ name, error: message ?? "Assertion failed" });
  }
}

function hasColumn(table: Record<string, unknown>, columnName: string) {
  return Object.prototype.hasOwnProperty.call(table, columnName);
}

function routerHasMiddleware(router: { stack?: Layer[] }, middlewareName: string) {
  return Boolean(router.stack?.some((layer) => layer.name === middlewareName));
}

function testPassASchemaColumns() {
  assert(hasColumn(tracks, "orgId"), "tracks exposes orgId column");
  assert(hasColumn(chapters, "orgId"), "chapters exposes orgId column");
  assert(hasColumn(batches, "orgId"), "batches exposes orgId column");
  assert(hasColumn(enrollments, "orgId"), "enrollments exposes orgId column");
}

function testPassARouteGuards() {
  assert(
    routerHasMiddleware(contentRouter as unknown as { stack?: Layer[] }, "requireOrgContext"),
    "content router enforces requireOrgContext"
  );
  assert(
    routerHasMiddleware(batchRouter as unknown as { stack?: Layer[] }, "requireOrgContext"),
    "batch router enforces requireOrgContext"
  );
  assert(
    routerHasMiddleware(learningRouter as unknown as { stack?: Layer[] }, "requireOrgContext"),
    "learning router enforces requireOrgContext"
  );
  assert(
    routerHasMiddleware(studentRouter as unknown as { stack?: Layer[] }, "requireOrgContext"),
    "student router enforces requireOrgContext"
  );
}

testPassASchemaColumns();
testPassARouteGuards();

if (failed.length > 0) {
  console.error("Failed:", failed);
  process.exit(1);
}

console.log(`layer3-pass-a-schema-and-guards: ${passed.length} assertions passed.`);
