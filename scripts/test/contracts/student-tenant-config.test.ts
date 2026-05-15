import * as tenantModule from "../../../apps/student-portal/src/lib/tenant";
import * as tenantConfigModule from "../../../apps/student-portal/src/config/tenants";

const {
  buildTenantMembershipRequest,
  buildTenantGoogleAuthUrl,
  buildTenantRegisterRequest,
  getCurrentTenantSlug,
  getSharedStudentAuthBranding,
  getStudentShellBranding,
  getTenantConfig,
  getTenantMetadata,
} = (
  "default" in tenantModule
    ? (tenantModule.default as typeof tenantModule)
    : tenantModule
) as {
  buildTenantMembershipRequest?: (
    slug?: "slmts" | "rr"
  ) => {
    body: { tenantSlug: "slmts" | "rr" };
    headers: { "X-Tenant-Slug": "slmts" | "rr" };
  };
  buildTenantGoogleAuthUrl?: (
    apiUrl: string,
    returnTo: string,
    slug?: "slmts" | "rr"
  ) => string;
  buildTenantRegisterRequest: typeof tenantModule.buildTenantRegisterRequest;
  getCurrentTenantSlug: typeof tenantModule.getCurrentTenantSlug;
  getSharedStudentAuthBranding: typeof tenantModule.getSharedStudentAuthBranding;
  getStudentShellBranding?: (slug?: "slmts" | "rr") => {
    displayName: string;
    logoPath: string;
    iconPath: string;
    logoAlt: string;
  };
  getTenantConfig: typeof tenantModule.getTenantConfig;
  getTenantMetadata: typeof tenantModule.getTenantMetadata;
};

const passed: string[] = [];
const failed: { name: string; error: string }[] = [];
const originalTenant = process.env.TENANT;
const originalPublicTenant = process.env.NEXT_PUBLIC_TENANT;
const tenantConfigExports = (
  "default" in tenantConfigModule
    ? (tenantConfigModule.default as typeof tenantConfigModule)
    : tenantConfigModule
) as Record<string, unknown>;
const getTenantBuildDirectory = tenantConfigExports
  .getTenantBuildDirectory as undefined | ((slug?: "slmts" | "rr") => string);

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

function testDefaultsToSlmtsForMissingOrInvalidTenant() {
  delete process.env.TENANT;
  assertEqual(
    getCurrentTenantSlug(),
    "slmts",
    "TENANT defaults to slmts when unset"
  );

  process.env.TENANT = "unknown";
  assertEqual(
    getCurrentTenantSlug(),
    "slmts",
    "TENANT defaults to slmts when invalid"
  );
}

function testReturnsRrTenantConfig() {
  const rrConfig = getTenantConfig("rr");

  assertEqual(rrConfig.slug, "rr", "rr config keeps rr slug");
  assertEqual(
    rrConfig.displayName,
    "Sri Raja Rajeswari Pathasala",
    "rr config exposes display name"
  );
  assertEqual(
    rrConfig.logoPath,
    "/branding/tenants/rr-logo.png",
    "rr config exposes tenant logo path"
  );
}

function testPrefersPublicTenantEnvForClientSafeResolution() {
  delete process.env.TENANT;
  process.env.NEXT_PUBLIC_TENANT = "rr";

  assertEqual(
    getCurrentTenantSlug(),
    "rr",
    "NEXT_PUBLIC_TENANT resolves tenant when TENANT is unavailable"
  );
}

function testTenantRegisterRequestCarriesTenantSlug() {
  const request = buildTenantRegisterRequest(
    {
      email: "student@example.com",
      password: "secret",
      firstName: "Sri",
      lastName: "Student",
    },
    "rr"
  );

  assertEqual(
    request.headers["X-Tenant-Slug"],
    "rr",
    "register request includes tenant header"
  );
  assertEqual(
    request.body.tenantSlug,
    "rr",
    "register request includes tenant slug in body"
  );
}

function testTenantMembershipRequestCarriesTenantSlug() {
  assert(
    typeof buildTenantMembershipRequest === "function",
    "membership request helper exists",
    "Expected buildTenantMembershipRequest to be exported"
  );

  if (!buildTenantMembershipRequest) {
    return;
  }

  const request = buildTenantMembershipRequest("rr");

  assertEqual(
    request.headers["X-Tenant-Slug"],
    "rr",
    "membership request includes tenant header"
  );
  assertEqual(
    request.body.tenantSlug,
    "rr",
    "membership request includes tenant slug in body"
  );
}

function testTenantGoogleAuthUrlCarriesTenantQueryParameters() {
  assert(
    typeof buildTenantGoogleAuthUrl === "function",
    "tenant google auth helper exists",
    "Expected buildTenantGoogleAuthUrl to be exported"
  );

  if (!buildTenantGoogleAuthUrl) {
    return;
  }

  const authUrl = buildTenantGoogleAuthUrl(
    "http://localhost:5000/api",
    "http://localhost:3001/my-learning",
    "rr"
  );
  const parsedUrl = new URL(authUrl);

  assertEqual(
    parsedUrl.origin + parsedUrl.pathname,
    "http://localhost:5000/api/auth/google",
    "google auth url targets auth/google endpoint"
  );
  assertEqual(
    parsedUrl.searchParams.get("tenantSlug"),
    "rr",
    "google auth url includes tenant slug query parameter"
  );
  assertEqual(
    parsedUrl.searchParams.get("returnTo"),
    "http://localhost:3001/my-learning",
    "google auth url includes post-auth return url query parameter"
  );
}

function testTenantMetadataUsesTenantSpecificBranding() {
  const metadata = getTenantMetadata("rr");

  assertEqual(
    metadata.title,
    "Sri Raja Rajeswari Pathasala",
    "metadata uses tenant title"
  );
  assertEqual(
    metadata.icons.icon[0]?.url,
    "/branding/tenants/rr-logo.png",
    "metadata uses tenant icon"
  );
}

function testSharedStudentAuthBrandingStaysNarada() {
  const sharedBranding = getSharedStudentAuthBranding();

  assertEqual(
    sharedBranding.logoPath,
    "/branding/shared/logo-stacked-dark-notag.svg",
    "left auth hero keeps Narada logo"
  );
  assertEqual(
    sharedBranding.patternPath,
    "/branding/shared/kolam-2.svg",
    "left auth hero keeps Narada pattern"
  );
  assertEqual(
    sharedBranding.logoAlt,
    "Narada LMS",
    "left auth hero keeps Narada alt text"
  );
}

function testStudentShellBrandingUsesTenantAssets() {
  assert(
    typeof getStudentShellBranding === "function",
    "student shell branding helper exists",
    "Expected getStudentShellBranding to be exported"
  );

  if (!getStudentShellBranding) {
    return;
  }

  const rrBranding = getStudentShellBranding("rr");

  assertEqual(
    rrBranding.displayName,
    "Sri Raja Rajeswari Pathasala",
    "student shell branding uses tenant display name"
  );
  assertEqual(
    rrBranding.logoPath,
    "/branding/tenants/rr-logo.png",
    "student shell branding uses tenant logo"
  );
  assertEqual(
    rrBranding.iconPath,
    "/branding/tenants/rr-logo.png",
    "student shell branding uses tenant icon"
  );
}

function testTenantBuildDirectorySeparatesTenantDevArtifacts() {
  assert(
    typeof getTenantBuildDirectory === "function",
    "tenant build directory helper exists",
    "Expected getTenantBuildDirectory to be exported"
  );

  if (!getTenantBuildDirectory) {
    return;
  }

  assertEqual(
    getTenantBuildDirectory("slmts"),
    ".next-slmts",
    "slmts uses tenant-specific build directory"
  );
  assertEqual(
    getTenantBuildDirectory("rr"),
    ".next-rr",
    "rr uses tenant-specific build directory"
  );
}

try {
  testDefaultsToSlmtsForMissingOrInvalidTenant();
  testPrefersPublicTenantEnvForClientSafeResolution();
  testReturnsRrTenantConfig();
  testTenantRegisterRequestCarriesTenantSlug();
  testTenantMembershipRequestCarriesTenantSlug();
  testTenantGoogleAuthUrlCarriesTenantQueryParameters();
  testTenantMetadataUsesTenantSpecificBranding();
  testSharedStudentAuthBrandingStaysNarada();
  testStudentShellBrandingUsesTenantAssets();
  testTenantBuildDirectorySeparatesTenantDevArtifacts();
} finally {
  if (originalTenant === undefined) {
    delete process.env.TENANT;
  } else {
    process.env.TENANT = originalTenant;
  }

  if (originalPublicTenant === undefined) {
    delete process.env.NEXT_PUBLIC_TENANT;
  } else {
    process.env.NEXT_PUBLIC_TENANT = originalPublicTenant;
  }
}

if (failed.length > 0) {
  console.error("Failed:", failed);
  process.exit(1);
}

console.log(`student-tenant-config: ${passed.length} assertions passed.`);
