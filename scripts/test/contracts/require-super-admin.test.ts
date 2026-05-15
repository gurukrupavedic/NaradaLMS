import type { NextFunction, Request, Response } from "express";
import { requireSuperAdmin } from "../../../server/shared/middleware/auth";

const passed: string[] = [];
const failed: { name: string; error: string }[] = [];

function assert(condition: boolean, name: string, message?: string) {
  if (condition) {
    passed.push(name);
  } else {
    failed.push({ name, error: message ?? "Assertion failed" });
  }
}

type MockResponse = Response & {
  statusCode?: number;
  jsonBody?: unknown;
};

function createMockResponse(): MockResponse {
  const res = {} as MockResponse;
  res.status = ((code: number) => {
    res.statusCode = code;
    return res;
  }) as Response["status"];
  res.json = ((body: unknown) => {
    res.jsonBody = body;
    return res;
  }) as Response["json"];
  return res;
}

function testUnauthorizedWithoutUser() {
  const req = {} as Request;
  const res = createMockResponse();
  let nextCalled = false;
  const next: NextFunction = () => {
    nextCalled = true;
  };

  requireSuperAdmin(req, res, next);

  assert(res.statusCode === 401, "requireSuperAdmin returns 401 without user");
  assert(
    JSON.stringify(res.jsonBody) ===
      JSON.stringify({ error: "Unauthorized - missing or invalid token" }),
    "requireSuperAdmin returns unauthorized body"
  );
  assert(nextCalled === false, "requireSuperAdmin does not call next without user");
}

function testForbiddenForOrgAdmin() {
  const req = {
    user: {
      id: "user-1",
      email: "orgadmin@example.com",
      isSuperAdmin: false,
      orgRoles: ["admin"],
    },
  } as Request;
  const res = createMockResponse();
  let nextCalled = false;
  const next: NextFunction = () => {
    nextCalled = true;
  };

  requireSuperAdmin(req, res, next);

  assert(res.statusCode === 403, "requireSuperAdmin returns 403 for org admin");
  assert(
    JSON.stringify(res.jsonBody) ===
      JSON.stringify({ error: "Super-admin access required" }),
    "requireSuperAdmin returns forbidden body"
  );
  assert(nextCalled === false, "requireSuperAdmin does not call next for org admin");
}

function testAllowsSuperAdmin() {
  const req = {
    user: {
      id: "user-2",
      email: "superadmin@example.com",
      isSuperAdmin: true,
      orgRoles: ["admin"],
    },
  } as Request;
  const res = createMockResponse();
  let nextCalled = false;
  const next: NextFunction = () => {
    nextCalled = true;
  };

  requireSuperAdmin(req, res, next);

  assert(nextCalled === true, "requireSuperAdmin calls next for super-admin");
  assert(res.statusCode === undefined, "requireSuperAdmin does not set status for super-admin");
}

testUnauthorizedWithoutUser();
testForbiddenForOrgAdmin();
testAllowsSuperAdmin();

if (failed.length > 0) {
  console.error("Failed:", failed);
  process.exit(1);
}

console.log(`require-super-admin: ${passed.length} assertions passed.`);
