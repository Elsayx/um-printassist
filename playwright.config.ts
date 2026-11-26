import { defineConfig } from '@playwright/test'
const baseURL = process.env.PLAYWRIGHT_BASE_URL || 'http://127.0.0.1:4173'
const browserName = (process.env.PLAYWRIGHT_BROWSER || 'chromium') as
  | 'chromium'
  | 'webkit'
  | 'firefox'
export default defineConfig({
  testDir: './e2e',
  timeout: 45000,
  fullyParallel: true,
  workers: 1,
  use: {
    baseURL,
    browserName,
    launchOptions: { executablePath: process.env.PLAYWRIGHT_EXECUTABLE_PATH },
    screenshot: 'only-on-failure',
  },
  webServer: process.env.PLAYWRIGHT_BASE_URL
    ? undefined
    : {
        command: 'npm run dev -- --port 4173 --strictPort',
        url: baseURL,
        reuseExistingServer: !process.env.CI,
      },
})
