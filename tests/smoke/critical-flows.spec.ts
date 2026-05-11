
import { test, expect } from '@playwright/test';
import jwt from 'jsonwebtoken';

// Use same secret as server/config.ts
const JWT_SECRET = process.env.JWT_SECRET || 'change-me-in-production';

function generateToken(payload: any): string {
    return jwt.sign(payload, JWT_SECRET, {
        expiresIn: '7d',
        algorithm: 'HS256',
        issuer: 'narada-lms',
    });
}

const BASE_URL = 'http://localhost:5000';

test.describe('Critical Flows Smoke Test', () => {

    test('Public: Login Page Loads', async ({ page }) => {
        await page.goto(`${BASE_URL}/login`);
        await expect(page).toHaveTitle(/Narada LMS|Login/);
        await expect(page.getByRole('button', { name: /Sign In/i })).toBeVisible();
        await expect(page.getByText('Welcome to SLMTS Learning')).toBeVisible();
    });

    test('Public: Register Tab Switch', async ({ page }) => {
        await page.goto(`${BASE_URL}/login`);
        await page.getByRole('tab', { name: 'Register' }).click();
        await expect(page.getByRole('button', { name: /Create Account/i })).toBeVisible();
        await expect(page.getByLabel('First name')).toBeVisible();
    });

    test('Student: Dashboard Loads (UI Login)', async ({ page }) => {
        await page.goto(`${BASE_URL}/login`);

        // Fill login form
        await page.getByLabel('Email').fill('kashyap.kuchipudi@gmail.com');
        await page.getByLabel('Password').fill('welcome123');
        await page.getByRole('button', { name: /Sign In/i }).click();

        // Wait for redirect
        await expect(page).toHaveURL(/.*\/app/);

        // Verify we are logged in (Sidebar visible)
        await expect(page.locator('aside')).toBeVisible();
    });

    test.skip('Admin: Users List Loads', async ({ browser }) => {
        const context = await browser.newContext();

        const token = generateToken({
            id: 'admin-123',
            email: 'admin@vedam.org',
            isSuperAdmin: true,
            currentOrgId: '00000000-0000-4000-8000-000000000001',
            orgRoles: ['admin'],
            orgMembershipStatus: 'active',
        });

        await context.addCookies([{
            name: 'auth_token',
            value: token,
            domain: 'localhost',
            path: '/',
            httpOnly: true,
            secure: false,
            sameSite: 'Strict'
        }]);

        const page = await context.newPage();
        await page.goto(`${BASE_URL}/admin/users`);

        // Assert on elements known to exist in UserManagementPage.tsx (Tabs and Table)
        await expect(page.getByRole('tab', { name: 'All Users' })).toBeVisible();
        await expect(page.getByRole('table')).toBeVisible();
    });

});
