/**
 * formatDate (@narada/types) tests.
 * Run with: npx tsx scripts/test/format-date.test.ts
 */

import { formatDate } from "@narada/types";

const passed: string[] = [];
const failed: { name: string; error: string }[] = [];

function assert(condition: boolean, name: string, message?: string) {
  if (condition) {
    passed.push(name);
  } else {
    failed.push({ name, error: message ?? "Assertion failed" });
  }
}

// Fixed date for stable assertions: 2024-06-15
const testDate = new Date("2024-06-15T12:00:00.000Z");

assert(formatDate(null) === "—", "null returns em dash");
assert(formatDate(undefined) === "—", "undefined returns em dash");
assert(formatDate("invalid") === "—", "invalid string returns em dash");
assert(formatDate(testDate).length > 0, "Date instance returns non-empty string");
assert(formatDate(testDate.toISOString()).length > 0, "ISO string returns non-empty string");
assert(formatDate(testDate.getTime()).length > 0, "timestamp returns non-empty string");

// en-US default: e.g. "Jun 15, 2024"
const en = formatDate(testDate, "en-US");
assert(en.includes("2024") && (en.includes("Jun") || en.includes("6")), "en-US includes year and month");

// Different locale can produce different output
const de = formatDate(testDate, "de-DE");
assert(de.length > 0 && de !== en, "de-DE produces different output from en-US");

if (failed.length > 0) {
  console.error("Failed:", failed);
  process.exit(1);
}
console.log(`formatDate: ${passed.length} tests passed.`);
