import type { Request } from "express";

import * as tenantContextModule from "../../server/modules/identity-access/tenant-context";
import { config } from "../../server/config";

const {
  buildOAuthState,
  resolveSafePostAuthRedirect,
  resolveTenantSlugForRequest,
} = (
  "default" in tenantContextModule
    ? (tenantContextModule.default as typeof tenantContextModule)
    : tenantContextModule
) as {
  buildOAuthState?: (options: {
    tenantSlug?: "slmts" | "rr";
    returnTo?: string;
  }) => string;
  resolveSafePostAuthRedirect?: (rawState?: string | null) => string;
  resolveTenantSlugForRequest: typeof tenantContextModule.resolveTenantSlugForRequest;
};

const passed: string[] = [];
const failed: { name: string; error: string }[] = [];

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

function createRequest(options?: {
  state?: string;
  queryTenantSlug?: string;
  headerTenantSlug?: string;
  bodyTenantSlug?: string;
}): Request {
  const query: Record<string, string> = {};
  if (options?.state) {
    query.state = options.state;
  }
  if (options?.queryTenantSlug) {
    query.tenantSlug = options.queryTenantSlug;
  }

  return {
    query,
    body: options?.bodyTenantSlug
      ? { tenantSlug: options.bodyTenantSlug }
      : {},
    get(headerName: string) {
      if (
        headerName.toLowerCase() === "x-tenant-slug" &&
        options?.headerTenantSlug
      ) {
        return options.headerTenantSlug;
      }
      return undefined;
    },
  } as Request;
}

function testOAuthStateTenantOverridesDefaultTenant() {
  assert(
    typeof buildOAuthState === "function",
    "oauth state builder exists",
    "Expected buildOAuthState to be exported"
  );

  if (!buildOAuthState) {
    return;
  }

  const req = createRequest({
    state: buildOAuthState({
      tenantSlug: "rr",
      returnTo: "http://localhost:3010/vedic-learning",
    }),
  });

  assertEqual(
    resolveTenantSlugForRequest(req),
    "rr",
    "oauth state tenant slug overrides default tenant"
  );
}

function testQueryTenantSlugResolvesStartRequestTenant() {
  const req = createRequest({
    queryTenantSlug: "rr",
  });

  assertEqual(
    resolveTenantSlugForRequest(req),
    "rr",
    "tenant query parameter resolves start-request tenant when oauth state is absent"
  );
}

function testHeaderStillWinsWithoutOAuthStateOrQueryTenantSlug() {
  const req = createRequest({
    headerTenantSlug: "rr",
  });

  assertEqual(
    resolveTenantSlugForRequest(req),
    "rr",
    "tenant header still resolves request tenant when oauth state is absent"
  );
}

function testSafePostAuthRedirectAcceptsAllowedOrigin() {
  assert(
    typeof buildOAuthState === "function",
    "oauth state builder exists for redirect path",
    "Expected buildOAuthState to be exported"
  );
  assert(
    typeof resolveSafePostAuthRedirect === "function",
    "safe post-auth redirect helper exists",
    "Expected resolveSafePostAuthRedirect to be exported"
  );

  if (!buildOAuthState || !resolveSafePostAuthRedirect) {
    return;
  }

  const redirect = resolveSafePostAuthRedirect(
    buildOAuthState({
      returnTo: "http://localhost:3010/vedic-learning",
    })
  );

  assertEqual(
    redirect,
    "http://localhost:3010/vedic-learning",
    "safe post-auth redirect keeps allowed student return url"
  );
}

function testSafePostAuthRedirectFallsBackForUnknownOrigin() {
  assert(
    typeof buildOAuthState === "function",
    "oauth state builder exists for invalid origin path",
    "Expected buildOAuthState to be exported"
  );
  assert(
    typeof resolveSafePostAuthRedirect === "function",
    "safe post-auth redirect helper exists for invalid origin path",
    "Expected resolveSafePostAuthRedirect to be exported"
  );

  if (!buildOAuthState || !resolveSafePostAuthRedirect) {
    return;
  }

  const redirect = resolveSafePostAuthRedirect(
    buildOAuthState({
      tenantSlug: "rr",
      returnTo: "https://evil.example.com/vedic-learning",
    })
  );

  assertEqual(
    new URL(redirect).toString(),
    new URL(config.frontendUrl).toString(),
    "safe post-auth redirect falls back to frontend url for unknown origin"
  );
}

function testSafePostAuthRedirectRejectsTamperedState() {
  assert(
    typeof buildOAuthState === "function",
    "oauth state builder exists for tamper path",
    "Expected buildOAuthState to be exported"
  );
  assert(
    typeof resolveSafePostAuthRedirect === "function",
    "safe post-auth redirect helper exists for tamper path",
    "Expected resolveSafePostAuthRedirect to be exported"
  );

  if (!buildOAuthState || !resolveSafePostAuthRedirect) {
    return;
  }

  const state = buildOAuthState({
    tenantSlug: "rr",
    returnTo: "http://localhost:3010/vedic-learning",
  });
  const tamperedState = `${state}tampered`;

  assertEqual(
    new URL(resolveSafePostAuthRedirect(tamperedState)).toString(),
    new URL(config.frontendUrl).toString(),
    "tampered oauth state falls back to frontend url"
  );
}

testOAuthStateTenantOverridesDefaultTenant();
testQueryTenantSlugResolvesStartRequestTenant();
testHeaderStillWinsWithoutOAuthStateOrQueryTenantSlug();
testSafePostAuthRedirectAcceptsAllowedOrigin();
testSafePostAuthRedirectFallsBackForUnknownOrigin();
testSafePostAuthRedirectRejectsTamperedState();

if (failed.length > 0) {
  console.error("Failed:", failed);
  process.exit(1);
}

console.log(`oauth-tenant-context: ${passed.length} assertions passed.`);
