import { test, expect } from '@playwright/test';

const financeAccount = { email: 'finance@dfresto.com', password: 'password123' };
const pusatAccount = { email: 'admin@dfresto.com', password: 'password123' };

test.describe('Finance Pages', () => {
    test('should display Approve PO page', async ({ page }) => {
        await page.goto('/login');
        await page.fill('input[type="email"]', financeAccount.email);
        await page.fill('input[type="password"]', financeAccount.password);
        await page.click('button[type="submit"]');
        await page.waitForURL('**/dashboard', { timeout: 10000 });

        await page.goto('/dashboard/approve-po');
        await page.waitForTimeout(1500);
        const content = await page.content();
        expect(content).toContain('Approve');
    });

    test('should display Tagihan page', async ({ page }) => {
        await page.goto('/login');
        await page.fill('input[type="email"]', financeAccount.email);
        await page.fill('input[type="password"]', financeAccount.password);
        await page.click('button[type="submit"]');
        await page.waitForURL('**/dashboard', { timeout: 10000 });

        await page.goto('/dashboard/tagihan');
        await page.waitForTimeout(1500);
        // Page has "Tagihan Stokis" as title
        const content = await page.content();
        expect(content).toContain('Tagihan');
    });
});

test.describe('Analytics Page', () => {
    test('should display analytics dashboard', async ({ page }) => {
        await page.goto('/login');
        await page.fill('input[type="email"]', pusatAccount.email);
        await page.fill('input[type="password"]', pusatAccount.password);
        await page.click('button[type="submit"]');
        await page.waitForURL('**/dashboard', { timeout: 10000 });

        await page.goto('/dashboard/analytics');
        await page.waitForTimeout(2000);
        // Check for Analytics text or BarChart content
        const content = await page.content();
        // Page has "Analytics" in h1 and also shows ranking/stats
        expect(content.toLowerCase()).toContain('analytics');
    });
});

test.describe('Stokis Orders (Pusat)', () => {
    test('should display stokis orders page', async ({ page }) => {
        await page.goto('/login');
        await page.fill('input[type="email"]', pusatAccount.email);
        await page.fill('input[type="password"]', pusatAccount.password);
        await page.click('button[type="submit"]');
        await page.waitForURL('**/dashboard', { timeout: 10000 });

        await page.goto('/dashboard/orders-stokis');
        await page.waitForTimeout(1500);
        const content = await page.content();
        expect(content).toContain('Order');
    });
});
