
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

const BASE_URL = 'http://localhost:5173';

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

    test('Student: Dashboard Loads', async ({ browser }) => {
        const context = await browser.newContext();

        const token = generateToken({
            id: 'student-123',
            email: 'student@vedam.org',
            roles: ['student'],
            status: 'active'
        });

        // Cookie name must match server (auth_token)
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
        await page.goto(`${BASE_URL}/app/learning`);

        // Verify we are logged in (Sidebar visible)
        await expect(page.locator('aside')).toBeVisible();
    });

    test.skip('Admin: Users List Loads', async ({ browser }) => {
        const context = await browser.newContext();

        const token = generateToken({
            id: 'admin-123',
            email: 'admin@vedam.org',
            roles: ['admin'],
            status: 'active'
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
        await page.goto(`${BASE_URL}/app/admin/users`);

        // Assert on elements known to exist in UserManagementPage.tsx (Tabs and Table)
        await expect(page.getByRole('tab', { name: 'All Users' })).toBeVisible();
        await expect(page.getByRole('table')).toBeVisible();
    });

});
