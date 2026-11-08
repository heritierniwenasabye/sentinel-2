import { defineConfig } from '@playwright/test';
const baseURL = process.env.PLAYWRIGHT_BASE_URL || 'http://127.0.0.1:3000';
export default defineConfig({
  testDir: './e2e', timeout: 60000, workers: 1,
  use: { actionTimeout: 8000, baseURL, timezoneId: 'America/Chicago',
    launchOptions: { executablePath: process.env.CHROMIUM_PATH || undefined, args: ['--disable-dev-shm-usage'] },
    screenshot: 'only-on-failure', trace: 'retain-on-failure' },
  webServer: { command: `npm run dev -- --port ${new URL(baseURL).port || '3000'}`, url: baseURL, reuseExistingServer: !process.env.CI },
});
