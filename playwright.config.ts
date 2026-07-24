import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './tests',
  retries: 0,
  reporter: 'list',
  use: {
    baseURL: 'http://127.0.0.1:4173',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },
  ],
  webServer: {
    command: 'pnpm dev',
    reuseExistingServer: true,
    url: 'http://127.0.0.1:4173',
  },
})
