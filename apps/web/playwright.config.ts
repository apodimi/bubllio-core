import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  workers: 1,
  globalSetup: "./e2e/global-setup.ts",
  reporter: process.env.CI ? [["list"], ["./e2e/ci-reporter.ts"]] : "list",
  use: {
    baseURL: process.env.CORE_WEB_URL ?? "http://127.0.0.1:5174",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"], channel: "chrome" },
    },
  ],
  webServer: process.env.CORE_WEB_URL
    ? undefined
    : {
        command: "npm run dev -- --port 5174",
        url: "http://127.0.0.1:5174",
        reuseExistingServer: true,
      },
});
