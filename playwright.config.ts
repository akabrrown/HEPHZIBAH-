import fs from "node:fs";
import path from "node:path";
import { defineConfig, devices } from "@playwright/test";

const chromePath = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const fallbackChrome = fs.existsSync(chromePath)
  ? chromePath
  : path.join(
      process.env.LOCALAPPDATA ?? "C:\\Users\\Dell\\AppData\\Local",
      "ms-playwright",
      "chromium-1243",
      "chrome-win64",
      "chrome.exe"
    );
const executablePath =
  process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH ??
  (fs.existsSync(fallbackChrome) ? fallbackChrome : undefined);

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: "list",
  use: {
    baseURL: "http://127.0.0.1:3100",
    trace: "on-first-retry",
    launchOptions: executablePath ? { executablePath } : undefined,
  },
  projects: [
    {
      name: "desktop",
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "mobile",
      use: { ...devices["Pixel 5"] },
    },
  ],
  webServer: {
    command: "node ./node_modules/next/dist/bin/next start -p 3100",
    url: "http://127.0.0.1:3100/api/health",
    reuseExistingServer: false,
    timeout: 120000,
    env: {
      SESSION_SECRET:
        process.env.SESSION_SECRET ??
        "hephzibah-e2e-test-session-secret-minimum-32-chars-2026",
      TOKEN_HASH_PEPPER:
        process.env.TOKEN_HASH_PEPPER ?? "hephzibah-local-token-pepper-2026",
      CRON_SECRET: process.env.CRON_SECRET ?? "hephzibah-e2e-cron-secret-2026",
      NEXT_PUBLIC_SITE_URL: "http://127.0.0.1:3100",
      PGLITE_DATA_DIR: "./.pglite/e2e-run",
    },
  },
});
