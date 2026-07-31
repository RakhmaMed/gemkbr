import { test, expect } from '@playwright/test';

test('home and health endpoints', async ({ page, request }) => {
	const live = await request.get('/health/live');
	expect(live.ok()).toBeTruthy();

	await page.goto('/');
	await expect(page.getByRole('link', { name: 'GemKBR' }).first()).toBeVisible();
	await expect(page.getByRole('heading', { name: 'GemKBR' })).toBeVisible();
});

test('catalog to designer smoke', async ({ page }) => {
	await page.goto('/catalog');
	await expect(page.getByRole('heading', { name: 'Каталог' })).toBeVisible();
	await page.goto('/designer/bracelet');
	await expect(page.getByRole('heading', { name: 'Ваш браслет' })).toBeVisible({ timeout: 30_000 });
});
