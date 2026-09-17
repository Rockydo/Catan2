import { existsSync } from "node:fs";
import { defineConfig, devices } from "@playwright/test";
export default defineConfig({
  testDir: "./e2e",
  timeout: 60000,
  expect: { timeout: 10000 },
  fullyParallel: false,
  retries: 0,
  reporter: [["list"], ["html", { open: "never" }]],
  use: {
    baseURL: "http://127.0.0.1:4173",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  workers: 2,
  projects: [
    { name: "firefox", use: { ...devices["Desktop Firefox"] } },
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
        launchOptions: {
          executablePath: existsSync("/usr/bin/chromium")
            ? "/usr/bin/chromium"
            : undefined,
          args: ["--no-sandbox"],
        },
      },
    },
    {
      name: "mobile",
      use: {
        ...devices["Pixel 7"],
        launchOptions: {
          executablePath: existsSync("/usr/bin/chromium")
            ? "/usr/bin/chromium"
            : undefined,
          args: ["--no-sandbox"],
        },
      },
    },
  ],
  webServer: {
    command: "npm start",
    url: "http://127.0.0.1:4173",
    reuseExistingServer: !process.env.CI,
    timeout: 15000,
  },
});
