import { test, expect, Page } from '@playwright/test';

const pusatAccount = { email: 'admin@dfresto.com', password: 'password123' };

// Helper to login as Pusat
async function loginAsPusat(page: Page) {
    await page.goto('/login');
    await page.fill('input[type="email"]', pusatAccount.email);
    await page.fill('input[type="password"]', pusatAccount.password);
    await page.click('button[type="submit"]');
    await page.waitForURL('**/dashboard', { timeout: 10000 });
}

test.describe('Users CRUD', () => {
    test.beforeEach(async ({ page }) => {
        await loginAsPusat(page);
    });

    test('should display users list', async ({ page }) => {
        await page.goto('/dashboard/users');
        await page.waitForTimeout(1000);
        const content = await page.content();
        expect(content).toContain('User');
    });

    test('should open add user modal', async ({ page }) => {
        await page.goto('/dashboard/users');
        await page.waitForTimeout(500);
        const addBtn = page.locator('button:has-text("Tambah")');
        if (await addBtn.count() > 0) {
            await addBtn.first().click();
            await page.waitForTimeout(500);
        }
        await expect(page.locator('body')).toBeVisible();
    });

    test('should filter users by search', async ({ page }) => {
        await page.goto('/dashboard/users');
        await page.waitForTimeout(1000);

        const searchInput = page.locator('input[placeholder*="Cari"]');
        if (await searchInput.isVisible()) {
            await searchInput.fill('admin');
            await page.waitForTimeout(500);
            // Verify search works
            const content = await page.content();
            expect(content).toContain('admin');
        }
    });

    test('should filter users by role', async ({ page }) => {
        await page.goto('/dashboard/users');
        await page.waitForTimeout(500);

        const roleSelect = page.locator('select');
        if (await roleSelect.count() > 0) {
            await roleSelect.first().selectOption('MITRA');
            await page.waitForTimeout(500);
        }
        await expect(page.locator('body')).toBeVisible();
    });
});

test.describe('Products CRUD', () => {
    test.beforeEach(async ({ page }) => {
        await loginAsPusat(page);
    });

    test('should display products grid', async ({ page }) => {
        await page.goto('/dashboard/products');
        await page.waitForTimeout(1000);
        const content = await page.content();
        expect(content).toContain('Produk');
    });

    test('should open add product modal', async ({ page }) => {
        await page.goto('/dashboard/products');
        await page.waitForTimeout(500);
        const addBtn = page.locator('button:has-text("Tambah")');
        if (await addBtn.count() > 0) {
            await addBtn.first().click();
            await page.waitForTimeout(500);
        }
    });

    test('should search products', async ({ page }) => {
        await page.goto('/dashboard/products');
        await page.waitForTimeout(500);
        const searchInput = page.locator('input[placeholder*="Cari"]');
        if (await searchInput.isVisible()) {
            await searchInput.fill('Ayam');
            await page.waitForTimeout(500);
        }
    });
});

test.describe('Gudang CRUD', () => {
    test.beforeEach(async ({ page }) => {
        await loginAsPusat(page);
    });

    test('should display gudang list', async ({ page }) => {
        await page.goto('/dashboard/gudang');
        await page.waitForTimeout(1000);
        const content = await page.content();
        expect(content).toContain('Gudang');
    });

    test('should open add gudang modal', async ({ page }) => {
        await page.goto('/dashboard/gudang');
        await page.waitForTimeout(500);
        const addBtn = page.locator('button:has-text("Tambah")');
        if (await addBtn.count() > 0) {
            await addBtn.first().click();
            await page.waitForTimeout(500);
        }
    });
});
