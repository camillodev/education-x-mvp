import './tests/load-env.cjs'
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
    // Faz login real no Clerk uma vez e salva a sessão; os demais projects a reusam.
    { name: "setup", testMatch: /global\.setup\.ts/ },
    {
      // browserName fixado em chromium: os presets "iPhone SE"/"iPad Mini" usam WebKit por
      // padrão, e o ITP do WebKit bloqueia o cookie cross-site que o handshake de dev-instance
      // do Clerk precisa pra sincronizar __clerk_db_jwt entre localhost e *.accounts.dev — isso
      // trava toda navegação autenticada num loop infinito de redirect pro /sign-in. Chromium
      // não tem essa restrição. isMobile/hasTouch do preset são preservados via spread.
      name: "375px",
      testIgnore: /matricula.*\.spec\.ts/,
      use: {
        ...devices["iPhone SE"],
        browserName: "chromium",
        viewport: { width: 375, height: 812 },
        storageState: "playwright/.clerk/user.json",
      },
      dependencies: ["setup"],
    },
    {
      name: "768px",
      testIgnore: /matricula.*\.spec\.ts/,
      use: {
        ...devices["iPad Mini"],
        browserName: "chromium",
        viewport: { width: 768, height: 1024 },
        storageState: "playwright/.clerk/user.json",
      },
      dependencies: ["setup"],
    },
    {
      name: "1440px",
      testIgnore: /matricula.*\.spec\.ts/,
      use: { ...devices["Desktop Chrome"], viewport: { width: 1440, height: 900 }, storageState: "playwright/.clerk/user.json" },
      dependencies: ["setup"],
    },
    // Fluxo de matrícula (/m/[token]) é público, sem login — sem storageState, sem dependência de setup.
    {
      name: "matricula-mobile",
      testMatch: /matricula.*\.spec\.ts/,
      use: { ...devices["iPhone SE"], viewport: { width: 375, height: 812 } },
    },
  ],
  webServer: {
    command: process.env.CI ? "pnpm build && pnpm start" : "pnpm dev --hostname 127.0.0.1",
    url: "http://localhost:3000",
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
