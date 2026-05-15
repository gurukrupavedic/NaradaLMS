import type { NextFunction, Request, Response } from "express";

const passed: string[] = [];
const failed: { name: string; error: string }[] = [];

function assert(condition: boolean, name: string, message?: string) {
  if (condition) {
    passed.push(name);
    return;
  }

  failed.push({ name, error: message ?? "Assertion failed" });
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

async function run() {
  const authModule = (await import(
    "../../../server/shared/middleware/auth"
  )) as Record<string, unknown>;
  const middlewareModule = (await import(
    "../../../server/shared/middleware"
  )) as Record<string, unknown>;

  const requireRole = authModule.requireRole as
    | undefined
    | ((...roles: string[]) => (req: Request, res: Response, next: NextFunction) => unknown);
  const requireOrgRole = authModule.requireOrgRole as
    | undefined
    | ((...roles: string[]) => (req: Request, res: Response, next: NextFunction) => unknown);
  const requireOrgRoleStrict = authModule.requireOrgRoleStrict as
    | undefined
    | ((...roles: string[]) => (req: Request, res: Response, next: NextFunction) => unknown);
  const requireAdmin = authModule.requireAdmin as
    | undefined
    | ((req: Request, res: Response, next: NextFunction) => unknown);

  const requireOrgRoleFromIndex = middlewareModule.requireOrgRole as
    | undefined
    | ((...roles: string[]) => (req: Request, res: Response, next: NextFunction) => unknown);
  const requireOrgRoleStrictFromIndex = middlewareModule.requireOrgRoleStrict as
    | undefined
    | ((...roles: string[]) => (req: Request, res: Response, next: NextFunction) => unknown);

  assert(
    typeof requireRole === "function",
    "requireRole export exists in auth module"
  );
  assert(
    typeof requireOrgRole === "function",
    "requireOrgRole export exists in auth module",
    "Expected auth middleware to export requireOrgRole"
  );
  assert(
    typeof requireOrgRoleFromIndex === "function",
    "requireOrgRole export exists in middleware index",
    "Expected middleware barrel to export requireOrgRole"
  );
  assert(
    typeof requireOrgRoleStrictFromIndex === "function",
    "requireOrgRoleStrict export exists in middleware index"
  );
  assert(
    typeof requireOrgRoleStrict === "function",
    "requireOrgRoleStrict export exists in auth module"
  );

  if (!requireRole || !requireOrgRole || !requireOrgRoleFromIndex || !requireOrgRoleStrict || !requireAdmin) {
    if (failed.length > 0) {
      console.error("Failed:", failed);
      process.exit(1);
    }
    return;
  }

  const req = {
    user: {
      id: "user-1",
      email: "admin@example.com",
      isSuperAdmin: false,
      orgRoles: ["admin"],
    },
  } as Request;
  const res = createMockResponse();
  let nextCalled = false;
  const next: NextFunction = () => {
    nextCalled = true;
  };

  requireOrgRole("admin")(req, res, next);

  assert(
    nextCalled === true,
    "requireOrgRole allows matching org role"
  );
  assert(
    res.statusCode === undefined,
    "requireOrgRole does not set status for allowed org role"
  );

  const forbiddenReq = {
    user: {
      id: "user-2",
      email: "student@example.com",
      isSuperAdmin: false,
      orgRoles: ["student"],
    },
  } as Request;
  const forbiddenRes = createMockResponse();
  let forbiddenNext = false;

  requireRole("admin")(forbiddenReq, forbiddenRes, () => {
    forbiddenNext = true;
  });

  assert(
    forbiddenRes.statusCode === 403,
    "requireRole compatibility alias still rejects missing org role"
  );
  assert(
    forbiddenNext === false,
    "requireRole compatibility alias does not call next when denied"
  );

  const superStudentReq = {
    user: {
      id: "user-super",
      email: "super@example.com",
      isSuperAdmin: true,
      orgRoles: ["student"],
    },
  } as Request;
  const superStudentRes = createMockResponse();
  let superStudentNext = false;
  requireOrgRole("admin")(superStudentReq, superStudentRes, () => {
    superStudentNext = true;
  });
  assert(
    superStudentRes.statusCode === 403,
    "requireOrgRole denies super-admin without org admin role (§3.4)"
  );
  assert(
    superStudentNext === false,
    "requireOrgRole does not call next for super-admin without admin in orgRoles"
  );

  const superAdminReq = {
    user: {
      id: "user-super2",
      email: "super2@example.com",
      isSuperAdmin: true,
      orgRoles: ["admin"],
    },
  } as Request;
  const superAdminRes = createMockResponse();
  let superAdminNext = false;
  requireAdmin(superAdminReq, superAdminRes, () => {
    superAdminNext = true;
  });
  assert(superAdminNext === true, "requireAdmin allows super-admin when JWT has org admin");
  assert(
    superAdminRes.statusCode === undefined,
    "requireAdmin does not set status when super has org admin"
  );
}

await run();

if (failed.length > 0) {
  console.error("Failed:", failed);
  process.exit(1);
}

console.log(`require-org-role-alias: ${passed.length} assertions passed.`);
