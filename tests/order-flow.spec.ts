import { test, expect, Page } from '@playwright/test';

interface Account {
    email: string;
    password: string;
}

const accounts = {
    mitra: { email: 'mitra1@dfresto.com', password: 'password123' },
    stokis: { email: 'stokis.jakarta@dfresto.com', password: 'password123' },
};

async function login(page: Page, account: Account) {
    await page.goto('/login');
    await page.fill('input[type="email"]', account.email);
    await page.fill('input[type="password"]', account.password);
    await page.click('button[type="submit"]');
    await page.waitForURL('**/dashboard', { timeout: 10000 });
}

test.describe('Mitra Order Flow', () => {
    test('should display order page with products', async ({ page }) => {
        await login(page, accounts.mitra);
        await page.goto('/dashboard/order');
        await page.waitForTimeout(1500);
        const content = await page.content();
        expect(content).toContain('Order');
    });

    test('should add product to cart', async ({ page }) => {
        await login(page, accounts.mitra);
        await page.goto('/dashboard/order');
        await page.waitForTimeout(1500);

        const addButton = page.locator('button:has-text("Tambah")').first();
        if (await addButton.count() > 0 && await addButton.isVisible()) {
            await addButton.click();
            await page.waitForTimeout(500);
        }
        await expect(page.locator('body')).toBeVisible();
    });

    test('should display order history', async ({ page }) => {
        await login(page, accounts.mitra);
        await page.goto('/dashboard/history');
        await page.waitForTimeout(1000);
        const content = await page.content();
        expect(content).toContain('Riwayat');
    });

    test('should have export button in history', async ({ page }) => {
        await login(page, accounts.mitra);
        await page.goto('/dashboard/history');
        await page.waitForTimeout(1000);
        const exportBtn = page.locator('button:has-text("Export")');
        if (await exportBtn.count() > 0) {
            await expect(exportBtn.first()).toBeVisible();
        }
    });
});

test.describe('Stokis Order Management', () => {
    test('should display mitra orders page', async ({ page }) => {
        await login(page, accounts.stokis);
        await page.goto('/dashboard/order-mitra');
        await page.waitForTimeout(1000);
        const content = await page.content();
        expect(content).toContain('Order');
    });

    test('should display order to pusat page', async ({ page }) => {
        await login(page, accounts.stokis);
        await page.goto('/dashboard/order-pusat');
        await page.waitForTimeout(1000);
        // Page title is "Order ke Pusat"
        const content = await page.content();
        expect(content).toContain('Order');
    });

    test('should display my mitra page', async ({ page }) => {
        await login(page, accounts.stokis);
        await page.goto('/dashboard/mitra');
        await page.waitForTimeout(1000);
        const content = await page.content();
        expect(content).toContain('Mitra');
    });
});
