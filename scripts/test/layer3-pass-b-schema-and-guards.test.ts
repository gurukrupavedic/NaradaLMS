import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import {
  audioFiles,
  auditLogs,
  mediaSegments,
  proficiencyEvaluationLog,
  segmentMappings,
  studentProgress,
  textSegments,
} from "../../packages/types/src/schema";

type TableWithColumns = Record<string, unknown>;
type ColumnWithMetadata = {
  name?: string;
  notNull?: boolean;
  columnType?: string;
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

function getColumn(table: TableWithColumns, columnName: string) {
  return table[columnName] as ColumnWithMetadata | undefined;
}

function assertOrgColumn(
  table: TableWithColumns,
  tableName: string,
  expectedNotNull: boolean
) {
  const column = getColumn(table, "orgId");
  assert(Boolean(column), `${tableName} exposes orgId column`);
  assert(
    column?.name === "org_id",
    `${tableName} orgId column maps to org_id`,
    `${tableName}.orgId should map to org_id`
  );
  assert(
    column?.columnType === "PgUUID",
    `${tableName} orgId column is UUID`,
    `${tableName}.orgId should be a PgUUID column`
  );
  assert(
    column?.notNull === expectedNotNull,
    `${tableName} orgId nullability matches Pass B contract`,
    `${tableName}.orgId expected notNull=${expectedNotNull}, got ${String(column?.notNull)}`
  );
}

function testPassBSchemaColumns() {
  assertOrgColumn(audioFiles as TableWithColumns, "audioFiles", true);
  assertOrgColumn(textSegments as TableWithColumns, "textSegments", true);
  assertOrgColumn(mediaSegments as TableWithColumns, "mediaSegments", true);
  assertOrgColumn(segmentMappings as TableWithColumns, "segmentMappings", true);
  assertOrgColumn(studentProgress as TableWithColumns, "studentProgress", true);
  assertOrgColumn(
    proficiencyEvaluationLog as TableWithColumns,
    "proficiencyEvaluationLog",
    true
  );
  assertOrgColumn(auditLogs as TableWithColumns, "auditLogs", false);
}

function testLatestPassBMigrationShape() {
  const migrationsDir = join(process.cwd(), "migrations");
  const latestMigration = readdirSync(migrationsDir)
    .filter((entry) => /^\d+_.+\.sql$/.test(entry))
    .sort()
    .at(-1);

  assert(Boolean(latestMigration), "latest migration exists");
  if (!latestMigration) {
    return;
  }

  const sql = readFileSync(join(migrationsDir, latestMigration), "utf8");

  assert(sql.includes('DO $$'), "migration includes ordered backfill block");
  assert(sql.includes('UPDATE audio_files'), "migration backfills audio_files org_id");
  assert(sql.includes('UPDATE text_segments'), "migration backfills text_segments org_id");
  assert(sql.includes('UPDATE media_segments'), "migration backfills media_segments org_id");
  assert(
    sql.includes('UPDATE segment_mappings'),
    "migration backfills segment_mappings org_id"
  );
  assert(
    sql.includes('UPDATE student_progress'),
    "migration backfills student_progress org_id"
  );
  assert(
    sql.includes('UPDATE proficiency_evaluation_log'),
    "migration backfills proficiency_evaluation_log org_id"
  );
  assert(
    sql.includes('ALTER TABLE "audio_files" ALTER COLUMN "org_id" SET NOT NULL;'),
    "migration enforces NOT NULL after backfill for scoped tables"
  );
  assert(
    !sql.includes('ALTER TABLE "audit_logs" ALTER COLUMN "org_id" SET NOT NULL;'),
    "migration keeps audit_logs.org_id nullable"
  );
}

testPassBSchemaColumns();
testLatestPassBMigrationShape();

if (failed.length > 0) {
  console.error("Failed:", failed);
  process.exit(1);
}

console.log(`layer3-pass-b-schema-and-guards: ${passed.length} assertions passed.`);
