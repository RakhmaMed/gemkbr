import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
	testDir: 'tests/e2e',
	fullyParallel: true,
	forbidOnly: !!process.env.CI,
	retries: process.env.CI ? 2 : 0,
	use: {
		baseURL: process.env.PLAYWRIGHT_BASE_URL ?? 'http://127.0.0.1:4321',
		trace: 'on-first-retry',
	},
	projects: [
		{ name: 'desktop', use: { ...devices['Desktop Chrome'] } },
		{ name: 'mobile', use: { ...devices['iPhone 13'] } },
	],
	webServer: {
		command: 'pnpm preview --host 127.0.0.1 --port 4321',
		url: 'http://127.0.0.1:4321/health/live',
		reuseExistingServer: !process.env.CI,
		timeout: 120_000,
	},
});
