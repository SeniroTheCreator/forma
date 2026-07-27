// tests/setup/devServer.ts
//
// Vitest `globalSetup` for the `integration` project only.
//
// `tests/integration/proxy.test.ts` exercises route protection the only way it can be
// exercised honestly — by making real HTTP requests through the real Next.js request
// pipeline, since `src/proxy.ts` only runs as part of that pipeline. That used to mean
// `pnpm test` failed 2/75 unless the developer happened to have `pnpm dev` running in
// another terminal, with nothing saying so.
//
// This boots the dev server for the integration project and shuts it down afterwards, so
// `pnpm test` is self-contained from a clean checkout with only `pnpm supabase start`
// running. If something is already serving http://localhost:3000 (the common case during
// development, and what `playwright.config.ts`'s `reuseExistingServer` does too), it is
// reused as-is and left running.

import { spawn, type ChildProcess } from "node:child_process";

const BASE_URL = "http://localhost:3000";
const BOOT_TIMEOUT_MS = 180_000;

// Routes whose first request pays Next's on-demand dev compilation cost. Warming them
// here (with no timeout pressure) keeps that cost out of the tests' own timeouts.
const WARMUP_PATHS = ["/", "/login", "/dashboard", "/admin/users"];

let child: ChildProcess | undefined;

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function isServing(): Promise<boolean> {
  try {
    const res = await fetch(BASE_URL, { redirect: "manual", signal: AbortSignal.timeout(5_000) });
    return res.status < 500;
  } catch {
    return false;
  }
}

export async function setup() {
  if (await isServing()) {
    console.log("[integration] reusing the dev server already listening on :3000");
    return;
  }

  console.log("[integration] starting `pnpm dev` for the integration test project...");
  // shell: true because `pnpm` is a .cmd shim on Windows and is not directly executable.
  // detached (POSIX only) puts the shell + `next dev` in their own process group so
  // teardown can signal the whole group; on Windows that is done with taskkill /T instead.
  child = spawn("pnpm", ["dev"], {
    shell: true,
    stdio: "ignore",
    windowsHide: true,
    detached: process.platform !== "win32",
    // Vitest sets NODE_ENV=test in the process this globalSetup runs in, and Next.js
    // deliberately does NOT load `.env.local` when NODE_ENV is "test" (it is meant to be
    // the developer's personal file, excluded from test runs). Inheriting it verbatim
    // gave a dev server with no Supabase env at all, which 500s on every request with a
    // ZodError from src/lib/config/env.ts. Force the value `next dev` expects.
    env: { ...process.env, NODE_ENV: "development" },
  });

  const deadline = Date.now() + BOOT_TIMEOUT_MS;
  while (Date.now() < deadline) {
    if (child.exitCode !== null) {
      throw new Error(`[integration] dev server exited early with code ${child.exitCode}`);
    }
    if (await isServing()) {
      for (const path of WARMUP_PATHS) {
        await fetch(`${BASE_URL}${path}`, { redirect: "manual" }).catch(() => undefined);
      }
      console.log("[integration] dev server ready on :3000");
      return;
    }
    await sleep(500);
  }

  await teardown();
  throw new Error(`[integration] dev server did not become ready within ${BOOT_TIMEOUT_MS}ms`);
}

export async function teardown() {
  if (!child?.pid) return; // nothing started by us — an already-running server stays up

  const pid = child.pid;
  child = undefined;

  if (process.platform === "win32") {
    // child.kill() would only kill the pnpm shim and orphan the `next dev` process holding
    // port 3000; /T kills the whole tree.
    await new Promise<void>((resolve) => {
      const killer = spawn("taskkill", ["/pid", String(pid), "/T", "/F"], { stdio: "ignore", windowsHide: true });
      killer.on("exit", () => resolve());
      killer.on("error", () => resolve());
    });
  } else {
    process.kill(-pid, "SIGTERM");
  }
}
