const {
    canAccessAdminPortalFromLoginResponse,
    canAccessAdminPortalFromSession,
    hasActiveOrgRole,
    hasOrgAdminAnywhere,
    isOrgScopedAdminPath,
    isOrgScopedRole,
    isUsersAdminPath,
} = await import(
    new URL(
        "../../../apps/admin-portal/src/lib/admin-portal-access.ts",
        import.meta.url
    ).href
);

const passed: string[] = [];
const failed: { name: string; error: string }[] = [];

function assert(condition: boolean, name: string, message?: string) {
    if (condition) {
        passed.push(name);
        return;
    }
    failed.push({ name, error: message ?? "Assertion failed" });
}

function testHasOrgAdminAnywhere() {
    assert(
        hasOrgAdminAnywhere([
            { status: "active", roles: ["student"] },
            { status: "active", roles: ["admin"] },
        ]) === true,
        "hasOrgAdminAnywhere true when admin in any org"
    );
    assert(
        hasOrgAdminAnywhere([{ status: "active", roles: ["student"] }]) === false,
        "hasOrgAdminAnywhere false without admin"
    );
}

function testCanAccessAdminPortalFromSession() {
    assert(
        canAccessAdminPortalFromSession({
            isSuperAdmin: false,
            memberships: [{ status: "active", roles: ["admin"] }],
        }) === true,
        "session fallback allows org admin"
    );
    assert(
        canAccessAdminPortalFromSession({
            isSuperAdmin: true,
            memberships: [],
            canAccessAdminPortal: false,
        }) === false,
        "session respects explicit API false over super-admin"
    );
}

function testCanAccessAdminPortalFromLoginResponse() {
    assert(
        canAccessAdminPortalFromLoginResponse({
            user: { isSuperAdmin: false },
            canAccessAdminPortal: true,
            loginState: { memberships: [] },
        }) === true,
        "login prefers API boolean when true"
    );
    assert(
        canAccessAdminPortalFromLoginResponse({
            user: { isSuperAdmin: false },
            loginState: {
                memberships: [
                    { status: "active", roles: ["student"] },
                    { status: "active", roles: ["admin"] },
                ],
            },
        }) === true,
        "login fallback admin-only-on-secondary-org"
    );
}

function testHasActiveOrgRole() {
    const orgA = "00000000-0000-4000-8000-000000000001";
    const orgB = "00000000-0000-4000-8000-000000000002";
    assert(
        hasActiveOrgRole(
            [{ orgId: orgA, status: "active", roles: ["admin"] }],
            orgA,
            "admin"
        ) === true,
        "hasActiveOrgRole true for admin in current org"
    );
    assert(
        hasActiveOrgRole(
            [{ orgId: orgB, status: "active", roles: ["admin"] }],
            orgA,
            "admin"
        ) === false,
        "hasActiveOrgRole false when admin only in other org"
    );
    assert(
        hasActiveOrgRole(
            [{ orgId: orgA, status: "pending", roles: ["admin"] }],
            orgA,
            "admin"
        ) === false,
        "hasActiveOrgRole false for pending admin"
    );
    assert(
        hasActiveOrgRole(
            [{ orgId: orgA, status: "active", roles: ["student"] }],
            orgA,
            "admin"
        ) === false,
        "hasActiveOrgRole false without admin role in membership (e.g. student-only in org)"
    );
    assert(
        hasActiveOrgRole([], orgA, "admin") === false,
        "hasActiveOrgRole false when no memberships"
    );
    assert(
        hasActiveOrgRole(
            [{ orgId: orgA, status: "active", roles: ["admin"] }],
            undefined,
            "admin"
        ) === false,
        "hasActiveOrgRole false without currentOrgId"
    );
    assert(isOrgScopedRole("admin") === true, "admin is org-scoped role");
    assert(isOrgScopedRole("unknown") === false, "unknown role not org-scoped");
}

function testPathHelpers() {
    assert(isUsersAdminPath("/admin/users") === true, "users path exact");
    assert(isUsersAdminPath("/admin/users/xyz") === true, "users path prefix");
    assert(isUsersAdminPath("/admin/batches") === false, "batches not users");
    assert(isOrgScopedAdminPath("/admin/content") === true, "content org path");
    assert(isOrgScopedAdminPath("/admin/tracks/t1/chapters/c1") === true, "tracks org path");
    assert(isOrgScopedAdminPath("/admin") === false, "admin home not org-scoped");
}

testHasOrgAdminAnywhere();
testHasActiveOrgRole();
testCanAccessAdminPortalFromSession();
testCanAccessAdminPortalFromLoginResponse();
testPathHelpers();

if (failed.length > 0) {
    console.error("Failed:", failed);
    process.exit(1);
}

console.log(`admin-portal-client-access: ${passed.length} assertions passed.`);
