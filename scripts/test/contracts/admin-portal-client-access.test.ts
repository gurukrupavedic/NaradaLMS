const {
    canAccessAdminPortalFromLoginResponse,
    canAccessAdminPortalFromSession,
    hasOrgAdminAnywhere,
    isOrgScopedAdminPath,
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

function testPathHelpers() {
    assert(isUsersAdminPath("/admin/users") === true, "users path exact");
    assert(isUsersAdminPath("/admin/users/xyz") === true, "users path prefix");
    assert(isUsersAdminPath("/admin/batches") === false, "batches not users");
    assert(isOrgScopedAdminPath("/admin/content") === true, "content org path");
    assert(isOrgScopedAdminPath("/admin/tracks/t1/chapters/c1") === true, "tracks org path");
    assert(isOrgScopedAdminPath("/admin") === false, "admin home not org-scoped");
}

testHasOrgAdminAnywhere();
testCanAccessAdminPortalFromSession();
testCanAccessAdminPortalFromLoginResponse();
testPathHelpers();

if (failed.length > 0) {
    console.error("Failed:", failed);
    process.exit(1);
}

console.log(`admin-portal-client-access: ${passed.length} assertions passed.`);
