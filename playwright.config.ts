import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: 'tests/e2e',
  fullyParallel: false,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? 'github' : 'list',
  use: { trace: 'retain-on-failure' },
  webServer: {
    command: 'node tests/e2e/server.mjs',
    port: 4173,
    reuseExistingServer: !process.env.CI,
  },
});
