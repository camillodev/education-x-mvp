import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: "html",
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3000",
    trace: "on-first-retry",
  },
  projects: [
    { name: "375px", use: { ...devices["iPhone SE"], viewport: { width: 375, height: 812 } } },
    { name: "768px", use: { ...devices["iPad Mini"], viewport: { width: 768, height: 1024 } } },
    { name: "1440px", use: { ...devices["Desktop Chrome"], viewport: { width: 1440, height: 900 } } },
  ],
  webServer: {
    command: "DISABLE_CLERK=true pnpm dev",
    url: "http://localhost:3000",
    reuseExistingServer: !process.env.CI,
    env: { DISABLE_CLERK: "true" },
  },
});
