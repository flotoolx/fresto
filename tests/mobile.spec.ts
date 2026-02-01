import { test, expect } from '@playwright/test';

test.describe('Mobile Responsiveness', () => {
    test.use({ viewport: { width: 375, height: 667 } }); // iPhone SE

    test('login page is mobile friendly', async ({ page }) => {
        await page.goto('/login');
        await expect(page.locator('input[type="email"]')).toBeVisible();
        await expect(page.locator('input[type="password"]')).toBeVisible();
        await expect(page.locator('button[type="submit"]')).toBeVisible();
    });

    test('dashboard loads on mobile after login', async ({ page }) => {
        await page.goto('/login');
        await page.fill('input[type="email"]', 'admin@dfresto.com');
        await page.fill('input[type="password"]', 'password123');
        await page.click('button[type="submit"]');
        await page.waitForURL('**/dashboard', { timeout: 10000 });

        // Dashboard should load
        await expect(page.locator('body')).toBeVisible();
    });

    test('users page shows content on mobile', async ({ page }) => {
        await page.goto('/login');
        await page.fill('input[type="email"]', 'admin@dfresto.com');
        await page.fill('input[type="password"]', 'password123');
        await page.click('button[type="submit"]');
        await page.waitForURL('**/dashboard', { timeout: 10000 });

        await page.goto('/dashboard/users');
        await page.waitForTimeout(1500);

        const content = await page.content();
        expect(content).toContain('User');
    });

    test('products page has responsive grid', async ({ page }) => {
        await page.goto('/login');
        await page.fill('input[type="email"]', 'admin@dfresto.com');
        await page.fill('input[type="password"]', 'password123');
        await page.click('button[type="submit"]');
        await page.waitForURL('**/dashboard', { timeout: 10000 });

        await page.goto('/dashboard/products');
        await page.waitForTimeout(1000);
        const content = await page.content();
        expect(content).toContain('Produk');
    });
});

test.describe('Tablet Responsiveness', () => {
    test.use({ viewport: { width: 768, height: 1024 } }); // iPad

    test('dashboard works on tablet', async ({ page }) => {
        await page.goto('/login');
        await page.fill('input[type="email"]', 'admin@dfresto.com');
        await page.fill('input[type="password"]', 'password123');
        await page.click('button[type="submit"]');
        await page.waitForURL('**/dashboard', { timeout: 10000 });

        const content = await page.content();
        expect(content).toContain('Dashboard');
    });
});
