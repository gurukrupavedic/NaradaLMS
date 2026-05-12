import "dotenv/config";
import { eq, and } from "drizzle-orm";
import { db } from "../../server/db";
import { contentService } from "../../server/modules/content-publishing";
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
  membershipId: string;
  orgId: string;
  orgSlug: string;
  status: string;
  roles: string[];
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
      throw new Error("Unable to initialize CSRF token/cookie for session");
    }
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
    throw new Error(`${name} must be set to run second-org-join-smoke`);
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
  const email = `second-org+${unique}@test.local`;
  const password = "SecondOrg123!";
  const adminEmail = requireEnv("ADMIN_EMAIL");
  const adminPassword = requireEnv("DEV_SUPERADMIN_PASSWORD");

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

  const rrTrack = await contentService.createTrack({
    orgId: rrOrg.id,
    title: `6.3 RR Track ${unique}`,
    description: "Second-org join smoke marker for RR",
    createdBy: adminUser.id,
  });

  const studentSession = new ApiSession(BASE_URL);
  await studentSession.initialize();

  const registerResponse = await studentSession.request<{
    membership?: { status?: string };
  }>("/api/auth/register", {
    method: "POST",
    headers: { "X-Tenant-Slug": "slmts" },
    body: JSON.stringify({
      email,
      password,
      firstName: "Second",
      lastName: "Org",
      tenantSlug: "slmts",
    }),
  });
  assert(
    registerResponse.status === 200 || registerResponse.status === 201,
    `Expected register 200/201, got ${registerResponse.status}`
  );
  assert(
    registerResponse.data.membership?.status === "pending",
    "Expected new SLMTS membership to start pending"
  );

  const [studentUser] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, email))
    .limit(1);
  assert(!!studentUser, "Expected newly registered user to exist");

  const [slmtsMembership] = await db
    .select({ id: userOrganizations.id })
    .from(userOrganizations)
    .where(
      and(
        eq(userOrganizations.userId, studentUser.id),
        eq(userOrganizations.orgId, slmtsOrg.id)
      )
    )
    .limit(1);
  assert(!!slmtsMembership, "Expected SLMTS membership for new user");

  const adminSession = new ApiSession(BASE_URL);
  await adminSession.initialize();
  const adminLogin = await adminSession.request("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({ email: adminEmail, password: adminPassword }),
  });
  assert(adminLogin.status === 200, `Expected admin login 200, got ${adminLogin.status}`);

  const approveSlmts = await adminSession.request(
    `/api/auth/admin/memberships/${slmtsMembership.id}/approve`,
    {
      method: "POST",
    }
  );
  assert(approveSlmts.status === 200, "Expected SLMTS approval to succeed");

  const studentLogin = await studentSession.request<{
    loginState?: { hasActiveMembership?: boolean };
  }>("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
  assert(studentLogin.status === 200, `Expected student login 200, got ${studentLogin.status}`);
  assert(
    studentLogin.data.loginState?.hasActiveMembership === true,
    "Expected active SLMTS membership after approval"
  );

  const slmtsMe = await studentSession.request<{
    user?: SessionUser;
    memberships?: Membership[];
  }>("/api/auth/me");
  assert(slmtsMe.status === 200, `Expected /auth/me 200, got ${slmtsMe.status}`);
  assert(
    slmtsMe.data.user?.currentOrgId === slmtsOrg.id,
    "Expected active SLMTS to be the initial current org"
  );

  const requestRrMembership = await studentSession.request<{
    result?: string;
    membership?: { status?: string; orgSlug?: string };
  }>("/api/auth/request-membership", {
    method: "POST",
    headers: { "X-Tenant-Slug": "rr" },
    body: JSON.stringify({ tenantSlug: "rr" }),
  });
  assert(
    requestRrMembership.status === 200,
    `Expected RR membership request 200, got ${requestRrMembership.status}`
  );
  assert(
    requestRrMembership.data.result === "created_pending",
    `Expected created_pending result, got ${JSON.stringify(requestRrMembership.data)}`
  );
  assert(
    requestRrMembership.data.membership?.status === "pending",
    "Expected RR membership request to create pending membership"
  );
  assert(
    requestRrMembership.data.membership?.orgSlug === "rr",
    "Expected RR membership response to point at rr"
  );

  const pendingMe = await studentSession.request<{
    memberships?: Membership[];
  }>("/api/auth/me");
  assert(pendingMe.status === 200, `Expected pending /auth/me 200, got ${pendingMe.status}`);
  assert(
    pendingMe.data.memberships?.some(
      (membership) => membership.orgSlug === "rr" && membership.status === "pending"
    ) === true,
    "Expected /auth/me to show pending RR membership"
  );

  const switchPendingRr = await studentSession.request("/api/auth/switch-org", {
    method: "POST",
    body: JSON.stringify({ orgId: rrOrg.id }),
  });
  assert(
    switchPendingRr.status === 403,
    `Expected RR switch to fail while pending, got ${switchPendingRr.status}`
  );

  const [rrMembership] = await db
    .select({ id: userOrganizations.id })
    .from(userOrganizations)
    .where(
      and(
        eq(userOrganizations.userId, studentUser.id),
        eq(userOrganizations.orgId, rrOrg.id)
      )
    )
    .limit(1);
  assert(!!rrMembership, "Expected RR membership request row to exist");

  const approveRr = await adminSession.request(
    `/api/auth/admin/memberships/${rrMembership.id}/approve`,
    {
      method: "POST",
    }
  );
  assert(approveRr.status === 200, "Expected RR approval to succeed");

  const switchApprovedRr = await studentSession.request<{
    user?: SessionUser;
  }>("/api/auth/switch-org", {
    method: "POST",
    body: JSON.stringify({ orgId: rrOrg.id }),
  });
  assert(
    switchApprovedRr.status === 200,
    `Expected RR switch to succeed after approval, got ${switchApprovedRr.status}`
  );
  assert(
    switchApprovedRr.data.user?.currentOrgId === rrOrg.id,
    "Expected RR switch response to set currentOrgId to RR"
  );

  const rrMe = await studentSession.request<{
    user?: SessionUser;
    memberships?: Membership[];
  }>("/api/auth/me");
  assert(rrMe.status === 200, `Expected RR /auth/me 200, got ${rrMe.status}`);
  assert(
    rrMe.data.user?.currentOrgId === rrOrg.id,
    "Expected RR session to report RR current org"
  );
  assert(
    rrMe.data.memberships?.some(
      (membership) => membership.orgSlug === "rr" && membership.status === "active"
    ) === true,
    "Expected /auth/me to show active RR membership after approval"
  );

  const rrTracks = await studentSession.request<{ id: number; title: string }[]>(
    "/api/content/tracks"
  );
  assert(rrTracks.status === 200, `Expected RR track list 200, got ${rrTracks.status}`);
  assert(
    Array.isArray(rrTracks.data) &&
      rrTracks.data.some((track) => track.id === rrTrack.id),
    "Expected RR track list to include the RR smoke marker track"
  );

  console.log("second-org-join-smoke: 17 assertions passed.");
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
