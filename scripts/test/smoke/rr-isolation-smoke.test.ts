import "dotenv/config";
import { and, eq } from "drizzle-orm";
import { db } from "../../../server/db";
import { batchService } from "../../../server/modules/batch-cohort";
import { contentService } from "../../../server/modules/content-publishing";
import { organizations, userOrganizations, users } from "@narada/types";

const BASE_URL = process.env.API_BASE_URL || "http://localhost:5000";

type JsonResponse<T = unknown> = {
  status: number;
  data: T;
  headers: Headers;
};

type SessionUser = {
  currentOrgId?: string;
};

type Membership = {
  orgId: string;
  orgSlug: string;
  status: string;
  roles: string[];
};

type BatchListItem = {
  id: number;
  batchCode: string;
};

class ApiSession {
  private csrfToken = "";
  private csrfCookie = "";
  private authCookie = "";

  constructor(private readonly baseUrl: string) {}

  async initialize() {
    const response = await fetch(`${this.baseUrl}/api/csrf-token`);
    const payload = (await response.json()) as { csrfToken?: string };
    this.csrfToken = payload.csrfToken ?? "";
    this.csrfCookie = this.getCookie(response.headers, "__csrf=");

    if (!this.csrfToken || !this.csrfCookie) {
      throw new Error("Unable to initialize CSRF token/cookie for smoke session");
    }
  }

  async login(email: string, password: string) {
    const response = await this.request<{
      loginState?: { hasActiveMembership?: boolean };
    }>("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });

    const authCookie = this.getCookie(response.headers, "auth_token=");
    if (response.status !== 200 || !authCookie) {
      throw new Error(
        `Admin login failed (${response.status}): ${JSON.stringify(response.data)}`
      );
    }

    this.authCookie = authCookie;
    return response.data;
  }

  async request<T = unknown>(
    path: string,
    options: RequestInit = {}
  ): Promise<JsonResponse<T>> {
    const method = (options.method ?? "GET").toUpperCase();
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      ...(options.headers as Record<string, string> | undefined),
    };

    const cookies = [this.csrfCookie, this.authCookie].filter(Boolean).join("; ");
    if (cookies) {
      headers.Cookie = cookies;
    }

    if (["POST", "PUT", "PATCH", "DELETE"].includes(method) && this.csrfToken) {
      headers["x-csrf-token"] = this.csrfToken;
    }

    const response = await fetch(`${this.baseUrl}${path}`, {
      ...options,
      headers,
    });
    const text = await response.text();
    let data: T;
    try {
      data = JSON.parse(text) as T;
    } catch {
      data = text as T;
    }

    const authCookie = this.getCookie(response.headers, "auth_token=");
    if (authCookie) {
      this.authCookie = authCookie;
    }

    return { status: response.status, data, headers: response.headers };
  }

  private getCookie(headers: Headers, prefix: string) {
    const setCookies =
      typeof headers.getSetCookie === "function"
        ? headers.getSetCookie()
        : headers.get("set-cookie")
          ? [headers.get("set-cookie") as string]
          : [];

    return (
      setCookies
        .map((value) => value.split(";")[0])
        .find((value) => value.startsWith(prefix)) ?? ""
    );
  }
}

function requireEnv(name: string) {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`${name} must be set to run rr-isolation-smoke`);
  }
  return value;
}

function assert(condition: boolean, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

async function run() {
  const unique = Date.now();
  const adminEmail =
    process.env.SUPER_ADMIN_EMAIL?.trim() || process.env.ADMIN_EMAIL?.trim();
  if (!adminEmail) {
    throw new Error(
      "SUPER_ADMIN_EMAIL (or deprecated ADMIN_EMAIL) must be set for seeded admin login."
    );
  }
  const adminPassword =
    process.env.SUPER_ADMIN_PASSWORD?.trim() ||
    process.env.DEV_SUPERADMIN_PASSWORD?.trim();
  if (!adminPassword) {
    throw new Error(
      "SUPER_ADMIN_PASSWORD (or deprecated DEV_SUPERADMIN_PASSWORD) must be set for seeded admin login."
    );
  }

  const [adminUser] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, adminEmail))
    .limit(1);
  assert(!!adminUser, `Missing seeded admin user for ${adminEmail}`);

  const [slmtsOrg] = await db
    .select({ id: organizations.id, slug: organizations.slug })
    .from(organizations)
    .where(eq(organizations.slug, "slmts"))
    .limit(1);
  const [rrOrg] = await db
    .select({ id: organizations.id, slug: organizations.slug })
    .from(organizations)
    .where(eq(organizations.slug, "rr"))
    .limit(1);

  assert(!!slmtsOrg, "Expected seeded slmts organization");
  assert(!!rrOrg, "Expected seeded rr organization");

  const now = new Date();
  await db
    .insert(userOrganizations)
    .values({
      userId: adminUser.id,
      orgId: rrOrg.id,
      roles: ["student", "admin"],
      status: "active",
      requestedAt: now,
      approvedAt: now,
      approvedBy: adminUser.id,
      createdAt: now,
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: [userOrganizations.userId, userOrganizations.orgId],
      set: {
        roles: ["student", "admin"],
        status: "active",
        approvedAt: now,
        approvedBy: adminUser.id,
        updatedAt: now,
      },
    });

  const slmtsTrack = await contentService.createTrack({
    orgId: slmtsOrg.id,
    title: `6.2 SLMTS Track ${unique}`,
    description: "RR isolation smoke marker for SLMTS",
    createdBy: adminUser.id,
  });
  const rrTrack = await contentService.createTrack({
    orgId: rrOrg.id,
    title: `6.2 RR Track ${unique}`,
    description: "RR isolation smoke marker for RR",
    createdBy: adminUser.id,
  });

  const slmtsBatch = await batchService.createBatch({
    orgId: slmtsOrg.id,
    batchCode: `SLMTS-6-2-${unique}`,
    batchName: `SLMTS RR Isolation ${unique}`,
    trackId: slmtsTrack.id,
    primaryInstructorId: adminUser.id,
    createdBy: adminUser.id,
  });
  const rrBatch = await batchService.createBatch({
    orgId: rrOrg.id,
    batchCode: `RR-6-2-${unique}`,
    batchName: `RR Isolation ${unique}`,
    trackId: rrTrack.id,
    primaryInstructorId: adminUser.id,
    createdBy: adminUser.id,
  });

  const session = new ApiSession(BASE_URL);
  await session.initialize();
  const loginState = await session.login(adminEmail, adminPassword);
  assert(
    loginState.loginState?.hasActiveMembership === true,
    "Seeded admin should have an active membership at login"
  );

  const slmtsMe = await session.request<{
    user?: SessionUser;
    memberships?: Membership[];
  }>("/api/auth/me");
  assert(slmtsMe.status === 200, `Expected /api/auth/me 200, got ${slmtsMe.status}`);
  assert(
    slmtsMe.data.user?.currentOrgId === slmtsOrg.id,
    "Default currentOrgId should prefer active SLMTS"
  );
  assert(
    slmtsMe.data.memberships?.some(
      (membership) => membership.orgSlug === "rr" && membership.status === "active"
    ) === true,
    "Smoke setup should activate RR membership for the seeded admin"
  );

  const slmtsTracks = await session.request<{ id: number; title: string }[]>(
    "/api/content/tracks"
  );
  assert(
    slmtsTracks.status === 200 && Array.isArray(slmtsTracks.data),
    `Expected SLMTS track list 200 array, got ${slmtsTracks.status}`
  );
  assert(
    slmtsTracks.data.some((track) => track.id === slmtsTrack.id),
    "SLMTS track list should include the SLMTS marker track"
  );
  assert(
    !slmtsTracks.data.some((track) => track.id === rrTrack.id),
    "SLMTS track list should exclude the RR marker track"
  );

  const slmtsForeignTrack = await session.request(`/api/content/tracks/${rrTrack.id}`);
  assert(
    slmtsForeignTrack.status === 404,
    `Expected RR track lookup under SLMTS to return 404, got ${slmtsForeignTrack.status}`
  );

  const slmtsBatches = await session.request<{
    items?: BatchListItem[];
  }>("/api/batches?limit=100");
  assert(
    slmtsBatches.status === 200 && Array.isArray(slmtsBatches.data.items),
    `Expected SLMTS batch list 200 items, got ${slmtsBatches.status}`
  );
  assert(
    slmtsBatches.data.items.some((batch) => batch.id === slmtsBatch.id),
    "SLMTS batch list should include the SLMTS marker batch"
  );
  assert(
    !slmtsBatches.data.items.some((batch) => batch.id === rrBatch.id),
    "SLMTS batch list should exclude the RR marker batch"
  );

  const slmtsForeignBatch = await session.request(`/api/batches/${rrBatch.id}`);
  assert(
    slmtsForeignBatch.status === 404,
    `Expected RR batch lookup under SLMTS to return 404, got ${slmtsForeignBatch.status}`
  );

  const switchToRr = await session.request<{
    user?: SessionUser;
  }>("/api/auth/switch-org", {
    method: "POST",
    body: JSON.stringify({ orgId: rrOrg.id }),
  });
  assert(
    switchToRr.status === 200,
    `Expected RR switch-org 200, got ${switchToRr.status}: ${JSON.stringify(
      switchToRr.data
    )}`
  );
  assert(
    switchToRr.data.user?.currentOrgId === rrOrg.id,
    "switch-org response should set currentOrgId to RR"
  );

  const rrMe = await session.request<{
    user?: SessionUser;
  }>("/api/auth/me");
  assert(rrMe.status === 200, `Expected RR /api/auth/me 200, got ${rrMe.status}`);
  assert(
    rrMe.data.user?.currentOrgId === rrOrg.id,
    "RR session should report currentOrgId as RR"
  );

  const rrTracks = await session.request<{ id: number; title: string }[]>(
    "/api/content/tracks"
  );
  assert(
    rrTracks.status === 200 && Array.isArray(rrTracks.data),
    `Expected RR track list 200 array, got ${rrTracks.status}`
  );
  assert(
    rrTracks.data.some((track) => track.id === rrTrack.id),
    "RR track list should include the RR marker track"
  );
  assert(
    !rrTracks.data.some((track) => track.id === slmtsTrack.id),
    "RR track list should exclude the SLMTS marker track"
  );

  const rrForeignTrack = await session.request(`/api/content/tracks/${slmtsTrack.id}`);
  assert(
    rrForeignTrack.status === 404,
    `Expected SLMTS track lookup under RR to return 404, got ${rrForeignTrack.status}`
  );

  const rrBatches = await session.request<{
    items?: BatchListItem[];
  }>("/api/batches?limit=100");
  assert(
    rrBatches.status === 200 && Array.isArray(rrBatches.data.items),
    `Expected RR batch list 200 items, got ${rrBatches.status}`
  );
  assert(
    rrBatches.data.items.some((batch) => batch.id === rrBatch.id),
    "RR batch list should include the RR marker batch"
  );
  assert(
    !rrBatches.data.items.some((batch) => batch.id === slmtsBatch.id),
    "RR batch list should exclude the SLMTS marker batch"
  );

  const rrForeignBatch = await session.request(`/api/batches/${slmtsBatch.id}`);
  assert(
    rrForeignBatch.status === 404,
    `Expected SLMTS batch lookup under RR to return 404, got ${rrForeignBatch.status}`
  );

  console.log("rr-isolation-smoke: 16 assertions passed.");
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
