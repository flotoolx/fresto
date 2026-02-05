import { test, expect } from '@playwright/test';

// Test accounts (assuming these exist from seed)
const accounts = {
    finance: { email: 'finance@dfresto.com', password: 'password123' },
    stokis: { email: 'stokis.jakarta@dfresto.com', password: 'password123' },
    gudang: { email: 'gudang.ayam@dfresto.com', password: 'password123' },
};

test.describe('Phase 5: Finance & Stokis Enhancements', () => {

    // --- Component 5 & 11: Finance Dashboard ---
    test.describe('Finance Role Features', () => {
        test.beforeEach(async ({ page }) => {
            await page.goto('/login');
            await page.fill('input[type="email"]', accounts.finance.email);
            await page.fill('input[type="password"]', accounts.finance.password);
            await page.click('button[type="submit"]');
            await page.waitForURL('**/dashboard', { timeout: 15000 });
        });

        test('should access Pembayaran page', async ({ page }) => {
            await page.goto('/dashboard/pembayaran');
            await page.waitForTimeout(3000);

            // Verify page loaded - check for key content (case insensitive)
            const content = await page.content();
            expect(content.toLowerCase()).toContain('pembayaran');
        });

        test('should access Laporan Harga page', async ({ page }) => {
            await page.goto('/dashboard/laporan-harga');
            await page.waitForTimeout(2000);

            const content = await page.content();
            expect(content).toContain('Laporan Harga');
        });

        test('should see Approve PO page with correct content', async ({ page }) => {
            await page.goto('/dashboard/approve-po');
            await page.waitForTimeout(2000);

            const content = await page.content();
            expect(content).toContain('Approve PO');
        });
    });

    // --- Component 12 & 13: Stokis Features ---
    test.describe('Stokis Role Features', () => {
        test.beforeEach(async ({ page }) => {
            await page.goto('/login');
            await page.fill('input[type="email"]', accounts.stokis.email);
            await page.fill('input[type="password"]', accounts.stokis.password);
            await page.click('button[type="submit"]');
            await page.waitForURL('**/dashboard', { timeout: 15000 });
        });

        test('should see history page with new features', async ({ page }) => {
            await page.goto('/dashboard/history-pusat');
            await page.waitForTimeout(2000);

            const content = await page.content();
            expect(content).toContain('Riwayat Order');
        });

        test('should load Print PO preview page logic', async ({ page }) => {
            await page.goto('/po/stokis/fake-id-123');
            await page.waitForTimeout(2000);

            const content = await page.content();
            expect(content).toContain('PO tidak ditemukan');
        });
    });

    // --- Component 13: Gudang Features ---
    test.describe('Gudang Role Features', () => {
        test.beforeEach(async ({ page }) => {
            await page.goto('/login');
            await page.fill('input[type="email"]', accounts.gudang.email);
            await page.fill('input[type="password"]', accounts.gudang.password);
            await page.click('button[type="submit"]');
            await page.waitForURL('**/dashboard', { timeout: 15000 });
        });

        test('should see PO Masuk page', async ({ page }) => {
            await page.goto('/dashboard/po-masuk');
            await page.waitForTimeout(2000);

            const content = await page.content();
            expect(content).toContain('PO Masuk');
        });
    });

});
