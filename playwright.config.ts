import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e",
  webServer: {
    command: "pnpm dev",
    url: "http://localhost:3000",
    reuseExistingServer: !process.env.CI,
  },
  use: { baseURL: "http://localhost:3000" },
  // Playwright's 5s default is too tight for this app's auth flows in local dev: with the
  // placeholder Upstash credentials this repo ships with, every rate-limited action
  // (signup/login/forgot-password) waits out a DNS resolution failure before failing open,
  // which alone costs ~4.5s. Assertions that follow such an action — the "check your email"
  // toast in particular, which now auto-dismisses after 5s — were landing right on the
  // boundary and flaking.
  expect: { timeout: 15_000 },
});
