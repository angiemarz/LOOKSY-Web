import { defineConfig, devices } from '@playwright/test'

// Smoke tests against the production build (`vite preview`).
// PW_CHROMIUM_PATH lets a machine reuse a preinstalled Chromium.
const executablePath = process.env.PW_CHROMIUM_PATH || undefined

export default defineConfig({
  testDir: 'e2e',
  timeout: 60_000,
  retries: 0,
  reporter: [['list']],
  use: {
    baseURL: 'http://localhost:4173',
    locale: 'es-MX',
    launchOptions: { executablePath },
  },
  projects: [
    { name: 'iphone', use: { ...devices['iPhone 13'], browserName: 'chromium', launchOptions: { executablePath } } },
    { name: 'desktop', use: { ...devices['Desktop Chrome'], launchOptions: { executablePath } } },
  ],
  webServer: {
    command: 'npm run preview -- --port 4173 --strictPort',
    url: 'http://localhost:4173',
    reuseExistingServer: !process.env.CI,
  },
})
