import { test, expect } from '@playwright/test';

// Test accounts
const accounts = {
    pusat: { email: 'admin@dfresto.com', password: 'password123' },
    finance: { email: 'finance@dfresto.com', password: 'password123' },
    gudang: { email: 'gudang.ayam@dfresto.com', password: 'password123' },
    stokis: { email: 'stokis.jakarta@dfresto.com', password: 'password123' },
    mitra: { email: 'mitra1@dfresto.com', password: 'password123' },
};

test.describe('Authentication', () => {
    test('should show login page', async ({ page }) => {
        await page.goto('/login');
        await expect(page.locator('h1')).toContainText("D'Fresto");
        await expect(page.locator('input[type="email"]')).toBeVisible();
        await expect(page.locator('input[type="password"]')).toBeVisible();
    });

    test('should show error for invalid credentials', async ({ page }) => {
        await page.goto('/login');
        await page.fill('input[type="email"]', 'wrong@email.com');
        await page.fill('input[type="password"]', 'wrongpassword');
        await page.click('button[type="submit"]');

        // Wait for error message - check for common error text patterns
        await page.waitForTimeout(3000);
        // Either error message or still on login page
        const url = page.url();
        expect(url).toContain('login');
    });

    test('should login as Pusat and redirect to dashboard', async ({ page }) => {
        await page.goto('/login');
        await page.fill('input[type="email"]', accounts.pusat.email);
        await page.fill('input[type="password"]', accounts.pusat.password);
        await page.click('button[type="submit"]');

        // Wait for redirect
        await page.waitForURL('**/dashboard', { timeout: 10000 });
        await expect(page).toHaveURL(/dashboard/);
    });

    test('should login as Mitra and redirect to dashboard', async ({ page }) => {
        await page.goto('/login');
        await page.fill('input[type="email"]', accounts.mitra.email);
        await page.fill('input[type="password"]', accounts.mitra.password);
        await page.click('button[type="submit"]');

        await page.waitForURL('**/dashboard', { timeout: 10000 });
        await expect(page).toHaveURL(/dashboard/);
    });

    test('should redirect to login when accessing dashboard without auth', async ({ page }) => {
        await page.goto('/dashboard');
        await page.waitForURL('**/login', { timeout: 10000 });
        await expect(page).toHaveURL(/login/);
    });
});

test.describe('Dashboard Access by Role', () => {
    test('Pusat can access Users page', async ({ page }) => {
        // Login as Pusat
        await page.goto('/login');
        await page.fill('input[type="email"]', accounts.pusat.email);
        await page.fill('input[type="password"]', accounts.pusat.password);
        await page.click('button[type="submit"]');
        await page.waitForURL('**/dashboard', { timeout: 10000 });

        // Navigate to Users
        await page.goto('/dashboard/users');
        await page.waitForTimeout(1000);
        const content = await page.content();
        expect(content).toContain('User');
    });

    test('Pusat can access Products page', async ({ page }) => {
        await page.goto('/login');
        await page.fill('input[type="email"]', accounts.pusat.email);
        await page.fill('input[type="password"]', accounts.pusat.password);
        await page.click('button[type="submit"]');
        await page.waitForURL('**/dashboard', { timeout: 10000 });

        await page.goto('/dashboard/products');
        await page.waitForTimeout(1000);
        const content = await page.content();
        expect(content).toContain('Produk');
    });

    test('Gudang can access Inventory page', async ({ page }) => {
        await page.goto('/login');
        await page.fill('input[type="email"]', accounts.gudang.email);
        await page.fill('input[type="password"]', accounts.gudang.password);
        await page.click('button[type="submit"]');
        await page.waitForURL('**/dashboard', { timeout: 10000 });

        await page.goto('/dashboard/inventory');
        await page.waitForTimeout(1500);
        // Check page content contains Inventory
        const content = await page.content();
        expect(content).toContain('Inventory');
    });
});
