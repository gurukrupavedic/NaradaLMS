import * as tenantModule from "../../apps/student-portal/src/lib/tenant";

const {
  buildTenantRegisterRequest,
  getCurrentTenantSlug,
  getSharedStudentAuthBranding,
  getTenantConfig,
  getTenantMetadata,
} = (
  "default" in tenantModule
    ? (tenantModule.default as typeof tenantModule)
    : tenantModule
) as {
  buildTenantRegisterRequest: typeof tenantModule.buildTenantRegisterRequest;
  getCurrentTenantSlug: typeof tenantModule.getCurrentTenantSlug;
  getSharedStudentAuthBranding: typeof tenantModule.getSharedStudentAuthBranding;
  getTenantConfig: typeof tenantModule.getTenantConfig;
  getTenantMetadata: typeof tenantModule.getTenantMetadata;
};

const passed: string[] = [];
const failed: { name: string; error: string }[] = [];
const originalTenant = process.env.TENANT;

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
    "Raja Rajeswari Pathasala",
    "rr config exposes display name"
  );
  assertEqual(
    rrConfig.logoPath,
    "/branding/tenants/rr-logo.svg",
    "rr config exposes tenant logo path"
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

function testTenantMetadataUsesTenantSpecificBranding() {
  const metadata = getTenantMetadata("rr");

  assertEqual(
    metadata.title,
    "Raja Rajeswari Pathasala",
    "metadata uses tenant title"
  );
  assertEqual(
    metadata.icons.icon[0]?.url,
    "/branding/tenants/rr-icon.svg",
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

try {
  testDefaultsToSlmtsForMissingOrInvalidTenant();
  testReturnsRrTenantConfig();
  testTenantRegisterRequestCarriesTenantSlug();
  testTenantMetadataUsesTenantSpecificBranding();
  testSharedStudentAuthBrandingStaysNarada();
} finally {
  if (originalTenant === undefined) {
    delete process.env.TENANT;
  } else {
    process.env.TENANT = originalTenant;
  }
}

if (failed.length > 0) {
  console.error("Failed:", failed);
  process.exit(1);
}

console.log(`student-tenant-config: ${passed.length} assertions passed.`);
