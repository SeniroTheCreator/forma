import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "path";
import fs from "fs";

// Vitest does not load .env files into process.env by default (unlike
// `next dev`/`next build`). Load them here with a minimal dependency-free
// parser so modules that read `process.env.*` at import time (e.g.
// src/lib/config/env.ts) see real values — this lets integration tests run
// against the real local Supabase instance started via `pnpm supabase start`.
function loadDotEnvFiles(files: string[]) {
  for (const file of files) {
    const full = path.resolve(__dirname, file);
    if (!fs.existsSync(full)) continue;
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
      if (process.env[key] === undefined) process.env[key] = value;
    }
  }
}

loadDotEnvFiles([".env", ".env.local"]);

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    setupFiles: ["./vitest.setup.ts"],
    globals: true,
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      // Match Next.js's build-time behavior: the "react-server" export
      // condition resolves "server-only" to a no-op so real (unmocked)
      // server modules can be imported by integration tests.
      "server-only": path.resolve(__dirname, "./node_modules/server-only/empty.js"),
      // `next/headers`'s headers()/cookies() require Next's App Router
      // request-scoped AsyncLocalStorage store, which doesn't exist when a
      // Server Action is invoked directly (not through an actual HTTP
      // request) as in integration tests. Stub with plain, standards-based
      // equivalents so real business logic (Supabase calls, validation,
      // etc.) still runs unmocked.
      "next/headers": path.resolve(__dirname, "./tests/mocks/nextHeaders.ts"),
    },
  },
});
