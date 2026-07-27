import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "path";
import fs from "fs";

// Vitest does not load .env files into process.env by default (unlike
// `next dev`/`next build`). Parse them here with a minimal dependency-free
// parser so modules that read `process.env.*` at import time (e.g.
// src/lib/config/env.ts) see real values when running the integration
// project below — this lets `tests/integration/**` run against the real
// local Supabase instance started via `pnpm supabase start`.
//
// This returns a plain object rather than mutating `process.env` directly,
// and is wired in only via the "integration" project's `test.env` (scoped
// to that project's test files) so unit tests under `src/**` never see
// these values and stay exactly as isolated as before this was added.
function parseDotEnvFile(file: string): Record<string, string> {
  const full = path.resolve(__dirname, file);
  if (!fs.existsSync(full)) return {};
  const result: Record<string, string> = {};
  const content = fs.readFileSync(full, "utf-8");
  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq === -1) continue;
    const key = line.slice(0, eq).trim();
    let value = line.slice(eq + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    result[key] = value;
  }
  return result;
}

const integrationEnv = {
  ...parseDotEnvFile(".env"),
  ...parseDotEnvFile(".env.local"),
};

const alias = { "@": path.resolve(__dirname, "./src") };

export default defineConfig({
  test: {
    projects: [
      {
        plugins: [react()],
        resolve: { alias },
        test: {
          name: "unit",
          environment: "jsdom",
          setupFiles: ["./vitest.setup.ts"],
          globals: true,
          include: ["src/**/*.test.{ts,tsx}"],
        },
      },
      {
        plugins: [react()],
        resolve: {
          alias: {
            ...alias,
            // Match Next.js's build-time behavior: the "react-server" export
            // condition resolves "server-only" to a no-op so real (unmocked)
            // server modules can be imported by integration tests. Scoped to
            // this project only — unit tests keep opting in explicitly via
            // `vi.mock("server-only", ...)`, as they already do.
            "server-only": path.resolve(__dirname, "./node_modules/server-only/empty.js"),
            // `next/headers`'s headers()/cookies() require Next's App Router
            // request-scoped AsyncLocalStorage store, which doesn't exist
            // when a Server Action is invoked directly (not through an
            // actual HTTP request) as in integration tests. Stub with plain,
            // standards-based equivalents so real business logic (Supabase
            // calls, validation, etc.) still runs unmocked.
            "next/headers": path.resolve(__dirname, "./tests/mocks/nextHeaders.ts"),
          },
        },
        test: {
          name: "integration",
          environment: "jsdom",
          setupFiles: ["./vitest.setup.ts"],
          globals: true,
          include: ["tests/integration/**/*.test.{ts,tsx}"],
          env: integrationEnv,
          // Boots (and tears down) `pnpm dev` for the tests that exercise src/proxy.ts
          // through real HTTP, reusing an already-running server if there is one. See
          // tests/setup/devServer.ts. Scoped to this project, so the unit project never
          // pays for it.
          globalSetup: ["./tests/setup/devServer.ts"],
          // Real Supabase Auth round trips (signup/login) plus real Next.js route
          // rendering are well past Vitest's 5s default.
          testTimeout: 30_000,
          hookTimeout: 60_000,
        },
      },
    ],
  },
});
