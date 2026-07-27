# Reusable Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a production-ready, content-agnostic full-stack foundation — auth, RBAC, dashboard, admin panel, file storage, notifications — on Next.js + Supabase, ready for a specific product to be layered on later.

**Architecture:** Single Next.js (App Router) app at repo root. Server Actions call thin service functions in `lib/services`, which enforce validation (zod) and permissions (`lib/permissions`) before touching typed repository functions in `lib/db`, which use the Supabase client (RLS enforces authorization at the database layer too, as defense in depth).

**Tech Stack:** Next.js (App Router) + TypeScript + Tailwind + shadcn/ui, Supabase (Postgres/Auth/Storage), Resend (via Supabase Auth SMTP + direct API for app-triggered mail), Redux Toolkit + RTK Query, react-hook-form + zod, pino, Upstash Redis rate limiting, Vitest + Playwright, pnpm, Vercel.

Full design rationale: `docs/superpowers/specs/2026-07-27-foundation-design.md`.

## Global Constraints

- Package manager: pnpm exclusively — no npm/yarn lockfiles.
- Single Next.js app at repo root — no monorepo/workspaces.
- No raw SQL string concatenation anywhere in app code — all data access through the Supabase client or migration files.
- Every table gets RLS enabled in the same migration that creates it — never a follow-up migration.
- Every Server Action/Route Handler validates input with a zod schema before calling a service.
- Every service function that mutates data goes through a permission check via `lib/permissions` before writing.
- No real credentials anywhere — `.env.example` only, placeholder values.
- TDD: write the failing test before the implementation for every task under `lib/` and `src/app/**/actions.ts`. UI-only presentational tasks (layouts, landing page, form markup) use a build-then-verify step instead of a red/green unit test cycle — there is no business logic in them to unit test.
- Commit after every task (not every step) unless the task instructs otherwise.

---

## Task 1: Project Scaffold & Tooling

**Files:**
- Create: `package.json`, `tsconfig.json`, `next.config.ts`, `tailwind.config.ts`, `postcss.config.js`, `.eslintrc.json`, `.gitignore`, `vitest.config.ts`, `playwright.config.ts`, `src/app/layout.tsx`, `src/app/globals.css`

**Interfaces:**
- Produces: a runnable Next.js dev server (`pnpm dev`), a working Vitest runner (`pnpm test`), a working Playwright runner (`pnpm test:e2e`).

- [ ] **Step 1: Scaffold the Next.js app**

```bash
pnpm dlx create-next-app@latest . --typescript --tailwind --eslint --app --src-dir --import-alias "@/*" --use-pnpm
```

Answer "Yes" to any prompt about a non-empty directory only if it warns about `docs/` already existing; keep `docs/`.

- [ ] **Step 2: Add testing tooling**

```bash
pnpm add -D vitest @vitejs/plugin-react jsdom @testing-library/react @testing-library/jest-dom @playwright/test
pnpm dlx playwright install --with-deps chromium
```

- [ ] **Step 3: Create `vitest.config.ts`**

```typescript
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    setupFiles: ["./vitest.setup.ts"],
    globals: true,
  },
  resolve: {
    alias: { "@": path.resolve(__dirname, "./src") },
  },
});
```

```typescript
// vitest.setup.ts
import "@testing-library/jest-dom/vitest";
```

- [ ] **Step 4: Create `playwright.config.ts`**

```typescript
import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e",
  webServer: {
    command: "pnpm dev",
    url: "http://localhost:3000",
    reuseExistingServer: !process.env.CI,
  },
  use: { baseURL: "http://localhost:3000" },
});
```

- [ ] **Step 5: Add `test` scripts to `package.json`**

```json
{
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint",
    "test": "vitest run",
    "test:watch": "vitest",
    "test:e2e": "playwright test"
  }
}
```

- [ ] **Step 6: Verify the scaffold builds and tests run**

Run: `pnpm build && pnpm test`
Expected: build succeeds; vitest reports "No test files found" (not an error at this stage).

- [ ] **Step 7: Commit**

```bash
git init
git add -A
git commit -m "chore: scaffold Next.js app with vitest and playwright"
```

---

## Task 2: Config Module (env validation)

**Files:**
- Create: `src/lib/config/env.ts`
- Create: `.env.example`
- Create: `.env.local` (gitignored — local dev copy of `.env.example` with placeholder values, so `pnpm dev` doesn't crash on missing env vars)
- Test: `src/lib/config/env.test.ts`

**Interfaces:**
- Produces: `import { env } from "@/lib/config/env"` — a fully-typed, validated object. Every other module reads env vars through this, never `process.env` directly.

- [ ] **Step 1: Write the failing test**

```typescript
// src/lib/config/env.test.ts
import { describe, it, expect, beforeEach, vi } from "vitest";

describe("env config", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("throws if a required var is missing", async () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "");
    await expect(async () => {
      await import("./env");
    }).rejects.toThrow();
  });

  it("parses valid env vars into a typed object", async () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://example.supabase.co");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "anon-key");
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "service-key");
    vi.stubEnv("RESEND_API_KEY", "resend-key");
    vi.stubEnv("UPSTASH_REDIS_REST_URL", "https://example.upstash.io");
    vi.stubEnv("UPSTASH_REDIS_REST_TOKEN", "upstash-token");
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "http://localhost:3000");
    const { env } = await import("./env");
    expect(env.NEXT_PUBLIC_SUPABASE_URL).toBe("https://example.supabase.co");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test src/lib/config/env.test.ts`
Expected: FAIL — `Cannot find module './env'`

- [ ] **Step 3: Implement `src/lib/config/env.ts`**

```typescript
import { z } from "zod";

const envSchema = z.object({
  NEXT_PUBLIC_SITE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  RESEND_API_KEY: z.string().min(1),
  UPSTASH_REDIS_REST_URL: z.string().url(),
  UPSTASH_REDIS_REST_TOKEN: z.string().min(1),
  LOG_LEVEL: z.enum(["debug", "info", "warn", "error"]).default("info"),
});

export const env = envSchema.parse({
  NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
  RESEND_API_KEY: process.env.RESEND_API_KEY,
  UPSTASH_REDIS_REST_URL: process.env.UPSTASH_REDIS_REST_URL,
  UPSTASH_REDIS_REST_TOKEN: process.env.UPSTASH_REDIS_REST_TOKEN,
  LOG_LEVEL: process.env.LOG_LEVEL,
});
```

```bash
pnpm add zod
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test src/lib/config/env.test.ts`
Expected: PASS (2 tests)

- [ ] **Step 5: Create `.env.example`**

```
NEXT_PUBLIC_SITE_URL=http://localhost:3000
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url_here
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key_here
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key_here
RESEND_API_KEY=your_resend_api_key_here
UPSTASH_REDIS_REST_URL=your_upstash_redis_url_here
UPSTASH_REDIS_REST_TOKEN=your_upstash_redis_token_here
LOG_LEVEL=info
```

- [ ] **Step 6: Create `.env.local` (gitignored) with the same placeholder values**, and confirm `.gitignore` contains `.env*.local`.

- [ ] **Step 7: Commit**

```bash
git add src/lib/config .env.example .gitignore
git commit -m "feat: add validated env config module"
```

---

## Task 3: Errors & Logger Modules

**Files:**
- Create: `src/lib/errors/AppError.ts`
- Create: `src/lib/logger/index.ts`
- Test: `src/lib/errors/AppError.test.ts`
- Test: `src/lib/logger/index.test.ts`

**Interfaces:**
- Produces: `AppError`, `ValidationError`, `AuthError`, `ForbiddenError`, `NotFoundError`, `RateLimitError` classes, each with `.statusCode: number` and `.code: string`; `mapErrorToResponse(err: unknown): { status: number; body: { error: string; code: string } }`. `logger` (pino instance) with `.info/.warn/.error/.debug`.

- [ ] **Step 1: Write the failing tests**

```typescript
// src/lib/errors/AppError.test.ts
import { describe, it, expect } from "vitest";
import { AppError, ValidationError, NotFoundError, mapErrorToResponse } from "./AppError";

describe("AppError", () => {
  it("ValidationError has status 400", () => {
    const err = new ValidationError("bad input");
    expect(err.statusCode).toBe(400);
    expect(err.code).toBe("VALIDATION_ERROR");
  });

  it("NotFoundError has status 404", () => {
    expect(new NotFoundError("missing").statusCode).toBe(404);
  });

  it("mapErrorToResponse maps AppError subclasses", () => {
    const result = mapErrorToResponse(new ValidationError("bad input"));
    expect(result).toEqual({ status: 400, body: { error: "bad input", code: "VALIDATION_ERROR" } });
  });

  it("mapErrorToResponse maps unknown errors to a generic 500 without leaking details", () => {
    const result = mapErrorToResponse(new Error("db connection string leaked"));
    expect(result.status).toBe(500);
    expect(result.body.error).toBe("Internal server error");
  });
});
```

```typescript
// src/lib/logger/index.test.ts
import { describe, it, expect } from "vitest";
import { logger } from "./index";

describe("logger", () => {
  it("exposes standard log levels", () => {
    expect(typeof logger.info).toBe("function");
    expect(typeof logger.warn).toBe("function");
    expect(typeof logger.error).toBe("function");
    expect(typeof logger.debug).toBe("function");
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm test src/lib/errors src/lib/logger`
Expected: FAIL — modules not found

- [ ] **Step 3: Implement `src/lib/errors/AppError.ts`**

```typescript
export class AppError extends Error {
  statusCode = 500;
  code = "INTERNAL_ERROR";
  constructor(message: string) {
    super(message);
    this.name = this.constructor.name;
  }
}

export class ValidationError extends AppError {
  statusCode = 400;
  code = "VALIDATION_ERROR";
}

export class AuthError extends AppError {
  statusCode = 401;
  code = "AUTH_ERROR";
}

export class ForbiddenError extends AppError {
  statusCode = 403;
  code = "FORBIDDEN";
}

export class NotFoundError extends AppError {
  statusCode = 404;
  code = "NOT_FOUND";
}

export class RateLimitError extends AppError {
  statusCode = 429;
  code = "RATE_LIMITED";
}

export function mapErrorToResponse(err: unknown): { status: number; body: { error: string; code: string } } {
  if (err instanceof AppError) {
    return { status: err.statusCode, body: { error: err.message, code: err.code } };
  }
  return { status: 500, body: { error: "Internal server error", code: "INTERNAL_ERROR" } };
}
```

- [ ] **Step 4: Implement `src/lib/logger/index.ts`**

```typescript
import pino from "pino";
import { env } from "@/lib/config/env";

export const logger = pino({
  level: env.LOG_LEVEL,
  redact: ["password", "token", "authorization", "*.password", "*.token"],
});
```

```bash
pnpm add pino
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `pnpm test src/lib/errors src/lib/logger`
Expected: PASS (5 tests)

- [ ] **Step 6: Commit**

```bash
git add src/lib/errors src/lib/logger
git commit -m "feat: add AppError hierarchy and structured logger"
```

---

## Task 4: Security Headers

**Files:**
- Modify: `next.config.ts`
- Test: `src/lib/security/headers.test.ts`
- Create: `src/lib/security/headers.ts`

**Interfaces:**
- Produces: `securityHeaders: { key: string; value: string }[]` consumed by `next.config.ts`.

- [ ] **Step 1: Write the failing test**

```typescript
// src/lib/security/headers.test.ts
import { describe, it, expect } from "vitest";
import { securityHeaders } from "./headers";

describe("securityHeaders", () => {
  it("includes the required security headers", () => {
    const keys = securityHeaders.map((h) => h.key);
    expect(keys).toContain("Content-Security-Policy");
    expect(keys).toContain("X-Frame-Options");
    expect(keys).toContain("X-Content-Type-Options");
    expect(keys).toContain("Referrer-Policy");
    expect(keys).toContain("Permissions-Policy");
    expect(keys).toContain("Strict-Transport-Security");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test src/lib/security/headers.test.ts`
Expected: FAIL — module not found

- [ ] **Step 3: Implement `src/lib/security/headers.ts`**

```typescript
export const securityHeaders = [
  {
    key: "Content-Security-Policy",
    value: "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; connect-src 'self' https://*.supabase.co;",
  },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
];
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test src/lib/security/headers.test.ts`
Expected: PASS

- [ ] **Step 5: Wire into `next.config.ts`**

```typescript
import type { NextConfig } from "next";
import { securityHeaders } from "./src/lib/security/headers";

const nextConfig: NextConfig = {
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
```

- [ ] **Step 6: Commit**

```bash
git add next.config.ts src/lib/security
git commit -m "feat: add security headers"
```

---

## Task 5: Supabase Client Factories

**Files:**
- Create: `src/lib/supabase/client.ts` (browser client)
- Create: `src/lib/supabase/server.ts` (server component/action client, cookie-bound)
- Create: `src/lib/supabase/admin.ts` (service-role client, server-only)
- Create: `src/lib/supabase/database.types.ts` (placeholder — regenerated by Task 6)

**Interfaces:**
- Produces: `createBrowserSupabaseClient()`, `createServerSupabaseClient()` (async, reads/writes cookies via `next/headers`), `createAdminSupabaseClient()` (service-role key, never imported from client components).

- [ ] **Step 1: Install the Supabase packages**

```bash
pnpm add @supabase/supabase-js @supabase/ssr
```

- [ ] **Step 2: Create a placeholder types file**

```typescript
// src/lib/supabase/database.types.ts
// Regenerated in Task 6 via `supabase gen types typescript`.
export type Database = Record<string, unknown>;
```

- [ ] **Step 3: Implement `src/lib/supabase/client.ts`**

```typescript
import { createBrowserClient } from "@supabase/ssr";
import { env } from "@/lib/config/env";
import type { Database } from "./database.types";

export function createBrowserSupabaseClient() {
  return createBrowserClient<Database>(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
}
```

- [ ] **Step 4: Implement `src/lib/supabase/server.ts`**

```typescript
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { env } from "@/lib/config/env";
import type { Database } from "./database.types";

export async function createServerSupabaseClient() {
  const cookieStore = await cookies();
  return createServerClient<Database>(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll: (cookiesToSet) => {
        try {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        } catch {
          // called from a Server Component with no write access — middleware refreshes the session instead
        }
      },
    },
  });
}
```

- [ ] **Step 5: Implement `src/lib/supabase/admin.ts`**

```typescript
import "server-only";
import { createClient } from "@supabase/supabase-js";
import { env } from "@/lib/config/env";
import type { Database } from "./database.types";

export function createAdminSupabaseClient() {
  return createClient<Database>(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
```

```bash
pnpm add server-only
```

- [ ] **Step 6: Verify the app still builds**

Run: `pnpm build`
Expected: succeeds (no test here — these are thin factories exercised by later integration tests against a real Supabase instance)

- [ ] **Step 7: Commit**

```bash
git add src/lib/supabase
git commit -m "feat: add Supabase client factories"
```

---

## Task 6: Core Database Schema (users, roles, permissions)

**Files:**
- Create: `supabase/migrations/0001_core_schema.sql`
- Modify: `src/lib/supabase/database.types.ts` (regenerated, not hand-edited after this task)

**Interfaces:**
- Produces tables: `public.users`, `public.roles`, `public.permissions`, `public.role_permissions`, `public.user_roles`, with RLS enabled and a trigger populating `public.users` + default role on signup.

- [ ] **Step 1: Install and initialize the Supabase CLI, start local Postgres**

```bash
pnpm add -D supabase
pnpm supabase init
pnpm supabase start
```

- [ ] **Step 2: Write the migration**

```sql
-- supabase/migrations/0001_core_schema.sql

create table public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  first_name text not null,
  last_name text not null,
  email text not null,
  account_status text not null default 'active' check (account_status in ('active', 'suspended')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  last_login_at timestamptz
);

create table public.roles (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  description text
);

create table public.permissions (
  id uuid primary key default gen_random_uuid(),
  key text not null unique,
  description text
);

create table public.role_permissions (
  role_id uuid not null references public.roles(id) on delete cascade,
  permission_id uuid not null references public.permissions(id) on delete cascade,
  primary key (role_id, permission_id)
);

create table public.user_roles (
  user_id uuid not null references public.users(id) on delete cascade,
  role_id uuid not null references public.roles(id) on delete cascade,
  primary key (user_id, role_id)
);

-- Seed default roles and permissions
insert into public.roles (name, description) values
  ('user', 'Default role for all signed-up users'),
  ('admin', 'Full administrative access');

insert into public.permissions (key, description) values
  ('users:read', 'Read any user profile'),
  ('users:write', 'Edit any user profile or role'),
  ('users:suspend', 'Suspend or reactivate a user account'),
  ('admin:access', 'Access the admin panel');

insert into public.role_permissions (role_id, permission_id)
select r.id, p.id from public.roles r, public.permissions p where r.name = 'admin';

-- Trigger: create a public.users row + default 'user' role on signup
create function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.users (id, first_name, last_name, email)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'first_name', ''),
    coalesce(new.raw_user_meta_data->>'last_name', ''),
    new.email
  );
  insert into public.user_roles (user_id, role_id)
  select new.id, id from public.roles where name = 'user';
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- RLS
alter table public.users enable row level security;
alter table public.roles enable row level security;
alter table public.permissions enable row level security;
alter table public.role_permissions enable row level security;
alter table public.user_roles enable row level security;

create function public.has_permission(uid uuid, perm_key text)
returns boolean
language sql
security definer set search_path = public
stable
as $$
  select exists (
    select 1
    from public.user_roles ur
    join public.role_permissions rp on rp.role_id = ur.role_id
    join public.permissions p on p.id = rp.permission_id
    where ur.user_id = uid and p.key = perm_key
  );
$$;

create policy "users select own or with users:read" on public.users
  for select using (id = auth.uid() or public.has_permission(auth.uid(), 'users:read'));

create policy "users update own or with users:write" on public.users
  for update using (id = auth.uid() or public.has_permission(auth.uid(), 'users:write'));

create policy "roles readable by authenticated" on public.roles
  for select using (auth.role() = 'authenticated');

create policy "permissions readable by authenticated" on public.permissions
  for select using (auth.role() = 'authenticated');

create policy "role_permissions readable by authenticated" on public.role_permissions
  for select using (auth.role() = 'authenticated');

create policy "user_roles select own or with users:read" on public.user_roles
  for select using (user_id = auth.uid() or public.has_permission(auth.uid(), 'users:read'));
```

- [ ] **Step 3: Apply the migration and regenerate types**

```bash
pnpm supabase db reset
pnpm supabase gen types typescript --local > src/lib/supabase/database.types.ts
```

- [ ] **Step 4: Verify the migration applied cleanly**

Run: `pnpm supabase db reset`
Expected: exits 0, prints "Applying migration 0001_core_schema.sql... done"

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations src/lib/supabase/database.types.ts
git commit -m "feat: add core schema — users, roles, permissions, RBAC trigger, RLS"
```

---

## Task 7: Files & Notifications Schema

**Files:**
- Create: `supabase/migrations/0002_files_notifications_audit.sql`
- Modify: `src/lib/supabase/database.types.ts` (regenerated)

**Interfaces:**
- Produces tables: `public.files`, `public.notifications`, `public.audit_log`, RLS enabled.

- [ ] **Step 1: Write the migration**

```sql
-- supabase/migrations/0002_files_notifications_audit.sql

create table public.files (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.users(id) on delete cascade,
  bucket text not null,
  path text not null,
  filename text not null,
  mime_type text not null,
  size_bytes bigint not null,
  created_at timestamptz not null default now()
);

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  recipient_id uuid not null references public.users(id) on delete cascade,
  type text not null,
  title text not null,
  message text not null,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.audit_log (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid not null references public.users(id),
  action text not null,
  target_type text not null,
  target_id uuid not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.files enable row level security;
alter table public.notifications enable row level security;
alter table public.audit_log enable row level security;

create policy "files owner crud" on public.files
  for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());

create policy "files admin read" on public.files
  for select using (public.has_permission(auth.uid(), 'users:read'));

create policy "notifications recipient select" on public.notifications
  for select using (recipient_id = auth.uid());

create policy "notifications recipient mark read" on public.notifications
  for update using (recipient_id = auth.uid()) with check (recipient_id = auth.uid());

create policy "audit_log admin read" on public.audit_log
  for select using (public.has_permission(auth.uid(), 'users:read'));
```

- [ ] **Step 2: Apply and regenerate types**

```bash
pnpm supabase db reset
pnpm supabase gen types typescript --local > src/lib/supabase/database.types.ts
```

- [ ] **Step 3: Verify**

Run: `pnpm supabase db reset`
Expected: exits 0, both migrations apply in order

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations src/lib/supabase/database.types.ts
git commit -m "feat: add files, notifications, audit_log schema"
```

---

## Task 8: Permissions Module

**Files:**
- Create: `src/lib/permissions/index.ts`
- Test: `src/lib/permissions/index.test.ts`

**Interfaces:**
- Consumes: a Supabase client (server or admin) passed in by the caller.
- Produces: `hasPermission(supabase: SupabaseClient, userId: string, permissionKey: string): Promise<boolean>`; `requirePermission(supabase, userId, permissionKey): Promise<void>` (throws `ForbiddenError`).

- [ ] **Step 1: Write the failing test**

```typescript
// src/lib/permissions/index.test.ts
import { describe, it, expect, vi } from "vitest";
import { hasPermission, requirePermission } from "./index";
import { ForbiddenError } from "@/lib/errors/AppError";

function makeSupabaseMock(result: boolean) {
  return {
    rpc: vi.fn().mockResolvedValue({ data: result, error: null }),
  } as any;
}

describe("permissions", () => {
  it("hasPermission returns true when the RPC says so", async () => {
    const supabase = makeSupabaseMock(true);
    await expect(hasPermission(supabase, "user-1", "users:read")).resolves.toBe(true);
    expect(supabase.rpc).toHaveBeenCalledWith("has_permission", { uid: "user-1", perm_key: "users:read" });
  });

  it("hasPermission returns false when the RPC says so", async () => {
    const supabase = makeSupabaseMock(false);
    await expect(hasPermission(supabase, "user-1", "admin:access")).resolves.toBe(false);
  });

  it("requirePermission throws ForbiddenError when not permitted", async () => {
    const supabase = makeSupabaseMock(false);
    await expect(requirePermission(supabase, "user-1", "admin:access")).rejects.toThrow(ForbiddenError);
  });

  it("requirePermission resolves when permitted", async () => {
    const supabase = makeSupabaseMock(true);
    await expect(requirePermission(supabase, "user-1", "admin:access")).resolves.toBeUndefined();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test src/lib/permissions`
Expected: FAIL — module not found

- [ ] **Step 3: Implement `src/lib/permissions/index.ts`**

```typescript
import type { SupabaseClient } from "@supabase/supabase-js";
import { ForbiddenError } from "@/lib/errors/AppError";

export async function hasPermission(supabase: SupabaseClient, userId: string, permissionKey: string): Promise<boolean> {
  const { data, error } = await supabase.rpc("has_permission", { uid: userId, perm_key: permissionKey });
  if (error) throw error;
  return Boolean(data);
}

export async function requirePermission(supabase: SupabaseClient, userId: string, permissionKey: string): Promise<void> {
  const allowed = await hasPermission(supabase, userId, permissionKey);
  if (!allowed) {
    throw new ForbiddenError(`Missing required permission: ${permissionKey}`);
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test src/lib/permissions`
Expected: PASS (4 tests)

- [ ] **Step 5: Commit**

```bash
git add src/lib/permissions
git commit -m "feat: add permissions gate (hasPermission/requirePermission)"
```

---

## Task 9: Auth Validation Schemas

**Files:**
- Create: `src/lib/validation/authSchemas.ts`
- Test: `src/lib/validation/authSchemas.test.ts`

**Interfaces:**
- Produces: `signupSchema`, `loginSchema`, `forgotPasswordSchema`, `resetPasswordSchema`, `changePasswordSchema` (all zod schemas), plus inferred TS types `SignupInput`, `LoginInput`, etc.

- [ ] **Step 1: Write the failing test**

```typescript
// src/lib/validation/authSchemas.test.ts
import { describe, it, expect } from "vitest";
import { signupSchema, loginSchema, changePasswordSchema } from "./authSchemas";

describe("authSchemas", () => {
  it("signupSchema rejects mismatched password confirmation", () => {
    const result = signupSchema.safeParse({
      firstName: "Ada",
      lastName: "Lovelace",
      email: "ada@example.com",
      password: "correct-horse-1",
      confirmPassword: "different",
    });
    expect(result.success).toBe(false);
  });

  it("signupSchema accepts a valid payload", () => {
    const result = signupSchema.safeParse({
      firstName: "Ada",
      lastName: "Lovelace",
      email: "ada@example.com",
      password: "correct-horse-1",
      confirmPassword: "correct-horse-1",
    });
    expect(result.success).toBe(true);
  });

  it("loginSchema requires a valid email", () => {
    const result = loginSchema.safeParse({ email: "not-an-email", password: "x" });
    expect(result.success).toBe(false);
  });

  it("changePasswordSchema requires 8+ char new password", () => {
    const result = changePasswordSchema.safeParse({ currentPassword: "old-pass-1", newPassword: "short" });
    expect(result.success).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test src/lib/validation/authSchemas.test.ts`
Expected: FAIL — module not found

- [ ] **Step 3: Implement `src/lib/validation/authSchemas.ts`**

```typescript
import { z } from "zod";

const password = z.string().min(8, "Password must be at least 8 characters");

export const signupSchema = z
  .object({
    firstName: z.string().min(1, "First name is required"),
    lastName: z.string().min(1, "Last name is required"),
    email: z.string().email(),
    password,
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1, "Password is required"),
});

export const forgotPasswordSchema = z.object({
  email: z.string().email(),
});

export const resetPasswordSchema = z
  .object({
    password,
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: password,
});

export type SignupInput = z.infer<typeof signupSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test src/lib/validation/authSchemas.test.ts`
Expected: PASS (4 tests)

- [ ] **Step 5: Commit**

```bash
git add src/lib/validation
git commit -m "feat: add auth validation schemas"
```

---

## Task 10: Rate Limit Module

**Files:**
- Create: `src/lib/rateLimit/index.ts`
- Test: `src/lib/rateLimit/index.test.ts`

**Interfaces:**
- Produces: `checkRateLimit(key: string): Promise<{ success: boolean }>` — throws `RateLimitError` via a wrapping helper `enforceRateLimit(key: string): Promise<void>`.

- [ ] **Step 1: Write the failing test**

```typescript
// src/lib/rateLimit/index.test.ts
import { describe, it, expect, vi } from "vitest";

vi.mock("@upstash/ratelimit", () => {
  return {
    Ratelimit: class {
      static slidingWindow() {
        return {};
      }
      limit = vi.fn().mockResolvedValue({ success: false });
    },
  };
});
vi.mock("@upstash/redis", () => ({ Redis: class {} }));

import { enforceRateLimit } from "./index";
import { RateLimitError } from "@/lib/errors/AppError";

describe("rateLimit", () => {
  it("throws RateLimitError when the limiter denies the request", async () => {
    await expect(enforceRateLimit("login:1.2.3.4")).rejects.toThrow(RateLimitError);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test src/lib/rateLimit`
Expected: FAIL — module not found

- [ ] **Step 3: Implement `src/lib/rateLimit/index.ts`**

```typescript
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import { env } from "@/lib/config/env";
import { RateLimitError } from "@/lib/errors/AppError";

const redis = new Redis({ url: env.UPSTASH_REDIS_REST_URL, token: env.UPSTASH_REDIS_REST_TOKEN });

const ratelimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(5, "60 s"),
});

export async function enforceRateLimit(key: string): Promise<void> {
  const { success } = await ratelimit.limit(key);
  if (!success) {
    throw new RateLimitError("Too many requests. Please try again shortly.");
  }
}
```

```bash
pnpm add @upstash/ratelimit @upstash/redis
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test src/lib/rateLimit`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/rateLimit
git commit -m "feat: add Upstash-backed rate limiter"
```

---

## Task 11: Auth Service

**Files:**
- Create: `src/lib/services/authService.ts`
- Test: `src/lib/services/authService.test.ts`

**Interfaces:**
- Consumes: `SignupInput`, `LoginInput`, `ForgotPasswordInput`, `ResetPasswordInput`, `ChangePasswordInput` from `@/lib/validation/authSchemas`; a Supabase client passed by the caller.
- Produces: `signup(supabase, input: SignupInput): Promise<{ userId: string }>`, `login(supabase, input: LoginInput): Promise<{ userId: string }>`, `logout(supabase): Promise<void>`, `resendVerificationEmail(supabase, email: string): Promise<void>`, `forgotPassword(supabase, input: ForgotPasswordInput): Promise<void>`, `resetPassword(supabase, input: ResetPasswordInput): Promise<void>`, `changePassword(supabase, input: ChangePasswordInput): Promise<void>`.

- [ ] **Step 1: Write the failing tests**

```typescript
// src/lib/services/authService.test.ts
import { describe, it, expect, vi } from "vitest";
import { signup, login, logout } from "./authService";
import { AuthError } from "@/lib/errors/AppError";

function makeSupabaseMock() {
  return {
    auth: {
      signUp: vi.fn(),
      signInWithPassword: vi.fn(),
      signOut: vi.fn().mockResolvedValue({ error: null }),
    },
  } as any;
}

describe("authService.signup", () => {
  it("calls supabase.auth.signUp with metadata and returns the new userId", async () => {
    const supabase = makeSupabaseMock();
    supabase.auth.signUp.mockResolvedValue({ data: { user: { id: "user-1" } }, error: null });

    const result = await signup(supabase, {
      firstName: "Ada",
      lastName: "Lovelace",
      email: "ada@example.com",
      password: "correct-horse-1",
      confirmPassword: "correct-horse-1",
    });

    expect(result).toEqual({ userId: "user-1" });
    expect(supabase.auth.signUp).toHaveBeenCalledWith({
      email: "ada@example.com",
      password: "correct-horse-1",
      options: { data: { first_name: "Ada", last_name: "Lovelace" } },
    });
  });

  it("throws AuthError when Supabase returns an error", async () => {
    const supabase = makeSupabaseMock();
    supabase.auth.signUp.mockResolvedValue({ data: { user: null }, error: { message: "Email already registered" } });

    await expect(
      signup(supabase, {
        firstName: "Ada",
        lastName: "Lovelace",
        email: "ada@example.com",
        password: "correct-horse-1",
        confirmPassword: "correct-horse-1",
      })
    ).rejects.toThrow(AuthError);
  });
});

describe("authService.login", () => {
  it("returns the userId on success", async () => {
    const supabase = makeSupabaseMock();
    supabase.auth.signInWithPassword.mockResolvedValue({ data: { user: { id: "user-1" } }, error: null });

    const result = await login(supabase, { email: "ada@example.com", password: "correct-horse-1" });
    expect(result).toEqual({ userId: "user-1" });
  });

  it("throws AuthError on invalid credentials", async () => {
    const supabase = makeSupabaseMock();
    supabase.auth.signInWithPassword.mockResolvedValue({ data: { user: null }, error: { message: "Invalid login credentials" } });

    await expect(login(supabase, { email: "ada@example.com", password: "wrong" })).rejects.toThrow(AuthError);
  });
});

describe("authService.logout", () => {
  it("calls supabase.auth.signOut", async () => {
    const supabase = makeSupabaseMock();
    await logout(supabase);
    expect(supabase.auth.signOut).toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm test src/lib/services/authService.test.ts`
Expected: FAIL — module not found

- [ ] **Step 3: Implement `src/lib/services/authService.ts`**

```typescript
import type { SupabaseClient } from "@supabase/supabase-js";
import { AuthError } from "@/lib/errors/AppError";
import { env } from "@/lib/config/env";
import type {
  SignupInput,
  LoginInput,
  ForgotPasswordInput,
  ResetPasswordInput,
  ChangePasswordInput,
} from "@/lib/validation/authSchemas";

export async function signup(supabase: SupabaseClient, input: SignupInput): Promise<{ userId: string }> {
  const { data, error } = await supabase.auth.signUp({
    email: input.email,
    password: input.password,
    options: { data: { first_name: input.firstName, last_name: input.lastName } },
  });
  if (error || !data.user) {
    throw new AuthError(error?.message ?? "Signup failed");
  }
  return { userId: data.user.id };
}

export async function login(supabase: SupabaseClient, input: LoginInput): Promise<{ userId: string }> {
  const { data, error } = await supabase.auth.signInWithPassword({ email: input.email, password: input.password });
  if (error || !data.user) {
    throw new AuthError(error?.message ?? "Invalid email or password");
  }
  return { userId: data.user.id };
}

export async function logout(supabase: SupabaseClient): Promise<void> {
  const { error } = await supabase.auth.signOut();
  if (error) throw new AuthError(error.message);
}

export async function resendVerificationEmail(supabase: SupabaseClient, email: string): Promise<void> {
  const { error } = await supabase.auth.resend({ type: "signup", email });
  if (error) throw new AuthError(error.message);
}

export async function forgotPassword(supabase: SupabaseClient, input: ForgotPasswordInput): Promise<void> {
  const { error } = await supabase.auth.resetPasswordForEmail(input.email, {
    redirectTo: `${env.NEXT_PUBLIC_SITE_URL}/reset-password`,
  });
  if (error) throw new AuthError(error.message);
}

export async function resetPassword(supabase: SupabaseClient, input: ResetPasswordInput): Promise<void> {
  const { error } = await supabase.auth.updateUser({ password: input.password });
  if (error) throw new AuthError(error.message);
}

export async function changePassword(supabase: SupabaseClient, input: ChangePasswordInput): Promise<void> {
  const { data: userData, error: getUserError } = await supabase.auth.getUser();
  if (getUserError || !userData.user?.email) throw new AuthError("Not authenticated");

  const { error: reauthError } = await supabase.auth.signInWithPassword({
    email: userData.user.email,
    password: input.currentPassword,
  });
  if (reauthError) throw new AuthError("Current password is incorrect");

  const { error } = await supabase.auth.updateUser({ password: input.newPassword });
  if (error) throw new AuthError(error.message);
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm test src/lib/services/authService.test.ts`
Expected: PASS (5 tests)

- [ ] **Step 5: Commit**

```bash
git add src/lib/services/authService.ts src/lib/services/authService.test.ts
git commit -m "feat: add authService (signup/login/logout/password flows)"
```

---

## Task 12: Auth Server Actions

**Files:**
- Create: `src/app/(auth)/actions.ts`
- Test: `tests/integration/auth-actions.test.ts` (requires local Supabase running — `pnpm supabase start`)

**Interfaces:**
- Consumes: `authService.*`, validation schemas, `enforceRateLimit`, `mapErrorToResponse`.
- Produces: `signupAction(formData: FormData): Promise<{ error?: string }>`, `loginAction`, `logoutAction`, `resendVerificationAction`, `forgotPasswordAction`, `resetPasswordAction`, `changePasswordAction` — each a Server Action returning `{ error?: string }` (redirects handled by the caller on success).

- [ ] **Step 1: Write the failing integration test**

```typescript
// tests/integration/auth-actions.test.ts
import { describe, it, expect } from "vitest";
import { signupAction, loginAction } from "@/app/(auth)/actions";

function formData(fields: Record<string, string>) {
  const fd = new FormData();
  Object.entries(fields).forEach(([k, v]) => fd.append(k, v));
  return fd;
}

describe("auth Server Actions (integration, local Supabase)", () => {
  it("signupAction creates a user and returns no error for valid input", async () => {
    const email = `test-${Date.now()}@example.com`;
    const result = await signupAction(
      formData({
        firstName: "Ada",
        lastName: "Lovelace",
        email,
        password: "correct-horse-1",
        confirmPassword: "correct-horse-1",
      })
    );
    expect(result.error).toBeUndefined();
  });

  it("signupAction returns a validation error for a mismatched confirmation", async () => {
    const result = await signupAction(
      formData({
        firstName: "Ada",
        lastName: "Lovelace",
        email: "ada2@example.com",
        password: "correct-horse-1",
        confirmPassword: "nope",
      })
    );
    expect(result.error).toBeDefined();
  });

  it("loginAction returns an error for unknown credentials", async () => {
    const result = await loginAction(formData({ email: "nobody@example.com", password: "whatever123" }));
    expect(result.error).toBeDefined();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm supabase start && pnpm test tests/integration/auth-actions.test.ts`
Expected: FAIL — module not found

- [ ] **Step 3: Implement `src/app/(auth)/actions.ts`**

```typescript
"use server";

import { headers } from "next/headers";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import * as authService from "@/lib/services/authService";
import {
  signupSchema,
  loginSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  changePasswordSchema,
} from "@/lib/validation/authSchemas";
import { enforceRateLimit } from "@/lib/rateLimit";
import { mapErrorToResponse } from "@/lib/errors/AppError";
import { logger } from "@/lib/logger";

async function clientIp(): Promise<string> {
  const h = await headers();
  return h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
}

export async function signupAction(formData: FormData): Promise<{ error?: string }> {
  const parsed = signupSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input" };

  try {
    await enforceRateLimit(`signup:${await clientIp()}`);
    const supabase = await createServerSupabaseClient();
    await authService.signup(supabase, parsed.data);
    return {};
  } catch (err) {
    logger.warn({ err }, "signup failed");
    return { error: mapErrorToResponse(err).body.error };
  }
}

export async function loginAction(formData: FormData): Promise<{ error?: string }> {
  const parsed = loginSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input" };

  try {
    await enforceRateLimit(`login:${await clientIp()}`);
    const supabase = await createServerSupabaseClient();
    await authService.login(supabase, parsed.data);
    await supabase
      .from("users")
      .update({ last_login_at: new Date().toISOString() })
      .eq("email", parsed.data.email);
    return {};
  } catch (err) {
    logger.warn({ err }, "login failed");
    return { error: mapErrorToResponse(err).body.error };
  }
}

export async function logoutAction(): Promise<void> {
  const supabase = await createServerSupabaseClient();
  await authService.logout(supabase);
}

export async function resendVerificationAction(formData: FormData): Promise<{ error?: string }> {
  const email = String(formData.get("email") ?? "");
  try {
    await enforceRateLimit(`resend-verification:${await clientIp()}`);
    const supabase = await createServerSupabaseClient();
    await authService.resendVerificationEmail(supabase, email);
    return {};
  } catch (err) {
    return { error: mapErrorToResponse(err).body.error };
  }
}

export async function forgotPasswordAction(formData: FormData): Promise<{ error?: string }> {
  const parsed = forgotPasswordSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input" };

  try {
    await enforceRateLimit(`forgot-password:${await clientIp()}`);
    const supabase = await createServerSupabaseClient();
    await authService.forgotPassword(supabase, parsed.data);
    return {};
  } catch (err) {
    return { error: mapErrorToResponse(err).body.error };
  }
}

export async function resetPasswordAction(formData: FormData): Promise<{ error?: string }> {
  const parsed = resetPasswordSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input" };

  try {
    const supabase = await createServerSupabaseClient();
    await authService.resetPassword(supabase, parsed.data);
    return {};
  } catch (err) {
    return { error: mapErrorToResponse(err).body.error };
  }
}

export async function changePasswordAction(formData: FormData): Promise<{ error?: string }> {
  const parsed = changePasswordSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input" };

  try {
    const supabase = await createServerSupabaseClient();
    await authService.changePassword(supabase, parsed.data);
    return {};
  } catch (err) {
    return { error: mapErrorToResponse(err).body.error };
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test tests/integration/auth-actions.test.ts`
Expected: PASS (3 tests)

- [ ] **Step 5: Commit**

```bash
git add "src/app/(auth)/actions.ts" tests/integration/auth-actions.test.ts
git commit -m "feat: add auth Server Actions with validation and rate limiting"
```

---

## Task 13: Signup & Login Pages

**Files:**
- Create: `src/components/ui/button.tsx`, `input.tsx`, `label.tsx`, `form.tsx`, `card.tsx` (via shadcn)
- Create: `src/components/features/auth/SignupForm.tsx`
- Create: `src/components/features/auth/LoginForm.tsx`
- Create: `src/app/(auth)/layout.tsx`
- Create: `src/app/(auth)/signup/page.tsx`
- Create: `src/app/(auth)/login/page.tsx`

**Interfaces:**
- Consumes: `signupAction`, `loginAction` from `@/app/(auth)/actions`; `signupSchema`, `loginSchema` for client-side `react-hook-form` validation.

This is a UI-only task (form markup + wiring to already-tested Server Actions) — no new business logic, so it uses a build-then-verify cycle instead of a unit-test cycle.

- [ ] **Step 1: Install shadcn/ui and add the primitives this task needs**

```bash
pnpm dlx shadcn@latest init -d
pnpm dlx shadcn@latest add button input label form card
pnpm add react-hook-form @hookform/resolvers
```

- [ ] **Step 2: Implement `src/components/features/auth/SignupForm.tsx`**

```tsx
"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useState, useTransition } from "react";
import { signupSchema, type SignupInput } from "@/lib/validation/authSchemas";
import { signupAction } from "@/app/(auth)/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function SignupForm() {
  const [isPending, startTransition] = useTransition();
  const [serverError, setServerError] = useState<string>();
  const [submitted, setSubmitted] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<SignupInput>({ resolver: zodResolver(signupSchema) });

  const onSubmit = (data: SignupInput) => {
    setServerError(undefined);
    const formData = new FormData();
    Object.entries(data).forEach(([key, value]) => formData.append(key, value));
    startTransition(async () => {
      const result = await signupAction(formData);
      if (result.error) setServerError(result.error);
      else setSubmitted(true);
    });
  };

  if (submitted) {
    return <p role="status">Check your email to verify your account.</p>;
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div>
        <Label htmlFor="firstName">First name</Label>
        <Input id="firstName" {...register("firstName")} />
        {errors.firstName && <p className="text-sm text-red-600">{errors.firstName.message}</p>}
      </div>
      <div>
        <Label htmlFor="lastName">Last name</Label>
        <Input id="lastName" {...register("lastName")} />
        {errors.lastName && <p className="text-sm text-red-600">{errors.lastName.message}</p>}
      </div>
      <div>
        <Label htmlFor="email">Email</Label>
        <Input id="email" type="email" {...register("email")} />
        {errors.email && <p className="text-sm text-red-600">{errors.email.message}</p>}
      </div>
      <div>
        <Label htmlFor="password">Password</Label>
        <Input id="password" type="password" {...register("password")} />
        {errors.password && <p className="text-sm text-red-600">{errors.password.message}</p>}
      </div>
      <div>
        <Label htmlFor="confirmPassword">Confirm password</Label>
        <Input id="confirmPassword" type="password" {...register("confirmPassword")} />
        {errors.confirmPassword && <p className="text-sm text-red-600">{errors.confirmPassword.message}</p>}
      </div>
      {serverError && <p className="text-sm text-red-600">{serverError}</p>}
      <Button type="submit" disabled={isPending}>
        {isPending ? "Creating account..." : "Sign up"}
      </Button>
    </form>
  );
}
```

- [ ] **Step 3: Implement `src/components/features/auth/LoginForm.tsx`** (same pattern as SignupForm, using `loginSchema`/`loginAction`, fields `email` + `password`, redirecting to `/dashboard` via `useRouter().push` on success)

```tsx
"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { loginSchema, type LoginInput } from "@/lib/validation/authSchemas";
import { loginAction } from "@/app/(auth)/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function LoginForm() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [serverError, setServerError] = useState<string>();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginInput>({ resolver: zodResolver(loginSchema) });

  const onSubmit = (data: LoginInput) => {
    setServerError(undefined);
    const formData = new FormData();
    Object.entries(data).forEach(([key, value]) => formData.append(key, value));
    startTransition(async () => {
      const result = await loginAction(formData);
      if (result.error) setServerError(result.error);
      else router.push("/dashboard");
    });
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div>
        <Label htmlFor="email">Email</Label>
        <Input id="email" type="email" {...register("email")} />
        {errors.email && <p className="text-sm text-red-600">{errors.email.message}</p>}
      </div>
      <div>
        <Label htmlFor="password">Password</Label>
        <Input id="password" type="password" {...register("password")} />
        {errors.password && <p className="text-sm text-red-600">{errors.password.message}</p>}
      </div>
      {serverError && <p className="text-sm text-red-600">{serverError}</p>}
      <Button type="submit" disabled={isPending}>
        {isPending ? "Logging in..." : "Log in"}
      </Button>
    </form>
  );
}
```

- [ ] **Step 4: Implement `src/app/(auth)/layout.tsx`**

```tsx
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/50 px-4">
      <div className="w-full max-w-sm">{children}</div>
    </div>
  );
}
```

- [ ] **Step 5: Implement `src/app/(auth)/signup/page.tsx` and `src/app/(auth)/login/page.tsx`**

```tsx
// src/app/(auth)/signup/page.tsx
import { SignupForm } from "@/components/features/auth/SignupForm";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function SignupPage() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Create an account</CardTitle>
      </CardHeader>
      <CardContent>
        <SignupForm />
      </CardContent>
    </Card>
  );
}
```

```tsx
// src/app/(auth)/login/page.tsx
import { LoginForm } from "@/components/features/auth/LoginForm";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function LoginPage() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Log in</CardTitle>
      </CardHeader>
      <CardContent>
        <LoginForm />
      </CardContent>
    </Card>
  );
}
```

- [ ] **Step 6: Build and manually verify**

Run: `pnpm dev`, visit `http://localhost:3000/signup` and `/login`, submit each form once with valid data against the local Supabase instance and confirm no console errors.

- [ ] **Step 7: Commit**

```bash
git add src/components src/app/"(auth)"
git commit -m "feat: add signup and login pages"
```

---

## Task 14: Verify-Email, Forgot-Password, Reset-Password Pages

**Files:**
- Create: `src/components/features/auth/ForgotPasswordForm.tsx`
- Create: `src/components/features/auth/ResetPasswordForm.tsx`
- Create: `src/components/features/auth/ResendVerificationButton.tsx`
- Create: `src/app/(auth)/verify-email/page.tsx`
- Create: `src/app/(auth)/forgot-password/page.tsx`
- Create: `src/app/(auth)/reset-password/page.tsx`

**Interfaces:**
- Consumes: `forgotPasswordAction`, `resetPasswordAction`, `resendVerificationAction`, `forgotPasswordSchema`, `resetPasswordSchema`.

UI-only task, build-then-verify.

- [ ] **Step 1: Implement `ForgotPasswordForm.tsx`** (same pattern as `LoginForm`, single `email` field, `forgotPasswordSchema`/`forgotPasswordAction`, shows a "check your email" success state instead of redirecting)

- [ ] **Step 2: Implement `ResetPasswordForm.tsx`** (same pattern, fields `password`/`confirmPassword`, `resetPasswordSchema`/`resetPasswordAction`, redirects to `/login` on success)

- [ ] **Step 3: Implement `ResendVerificationButton.tsx`**

```tsx
"use client";

import { useState, useTransition } from "react";
import { resendVerificationAction } from "@/app/(auth)/actions";
import { Button } from "@/components/ui/button";

export function ResendVerificationButton({ email }: { email: string }) {
  const [isPending, startTransition] = useTransition();
  const [sent, setSent] = useState(false);

  return (
    <Button
      variant="outline"
      disabled={isPending || sent}
      onClick={() => {
        const formData = new FormData();
        formData.append("email", email);
        startTransition(async () => {
          await resendVerificationAction(formData);
          setSent(true);
        });
      }}
    >
      {sent ? "Verification email sent" : "Resend verification email"}
    </Button>
  );
}
```

- [ ] **Step 4: Implement the three pages** following the `signup/page.tsx` pattern (Card + form component). `verify-email/page.tsx` reads `?email=` from `searchParams` and renders `ResendVerificationButton`.

- [ ] **Step 5: Build and manually verify**

Run: `pnpm dev`, visit `/forgot-password`, `/reset-password`, `/verify-email?email=test@example.com`, confirm each renders and submits without console errors.

- [ ] **Step 6: Commit**

```bash
git add src/components/features/auth src/app/"(auth)"
git commit -m "feat: add verify-email, forgot-password, reset-password pages"
```

---

## Task 15: Middleware Route Protection

**Files:**
- Create: `src/middleware.ts`
- Test: `tests/integration/middleware.test.ts`

**Interfaces:**
- Consumes: `createServerSupabaseClient` pattern (inlined for middleware's `NextRequest`/`NextResponse`), `hasPermission` from `@/lib/permissions`.
- Produces: redirects unauthenticated requests to `(dashboard)`/`(admin)` to `/login`; redirects authenticated non-admins away from `(admin)` to `/dashboard`.

- [ ] **Step 1: Write the failing integration test**

```typescript
// tests/integration/middleware.test.ts
import { describe, it, expect } from "vitest";

describe("middleware route protection (integration, local Supabase + dev server)", () => {
  it("redirects unauthenticated requests to /dashboard to /login", async () => {
    const res = await fetch("http://localhost:3000/dashboard", { redirect: "manual" });
    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toContain("/login");
  });

  it("redirects unauthenticated requests to /admin/users to /login", async () => {
    const res = await fetch("http://localhost:3000/admin/users", { redirect: "manual" });
    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toContain("/login");
  });
});
```

Note: run `pnpm dev` in a separate terminal before this test file — it exercises the real middleware over HTTP rather than mocking `NextRequest` internals, since `@supabase/ssr` cookie handling is awkward to unit-test in isolation.

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm dev` (separate terminal), then `pnpm test tests/integration/middleware.test.ts`
Expected: FAIL — 404s or non-redirect responses since `/dashboard` and `/admin` routes don't exist yet and no middleware runs

- [ ] **Step 3: Implement `src/middleware.ts`**

```typescript
import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { env } from "@/lib/config/env";

const PROTECTED_PREFIXES = ["/dashboard", "/settings", "/notifications"];
const ADMIN_PREFIXES = ["/admin"];

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (cookiesToSet) => {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const path = request.nextUrl.pathname;
  const isProtected = PROTECTED_PREFIXES.some((p) => path.startsWith(p));
  const isAdmin = ADMIN_PREFIXES.some((p) => path.startsWith(p));

  if ((isProtected || isAdmin) && !user) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  if (isAdmin && user) {
    const { data: allowed } = await supabase.rpc("has_permission", { uid: user.id, perm_key: "admin:access" });
    if (!allowed) {
      const url = request.nextUrl.clone();
      url.pathname = "/dashboard";
      return NextResponse.redirect(url);
    }
  }

  return response;
}

export const config = {
  matcher: ["/dashboard/:path*", "/settings/:path*", "/notifications/:path*", "/admin/:path*"],
};
```

- [ ] **Step 4: Add placeholder pages so the redirect targets exist**

```tsx
// src/app/(dashboard)/dashboard/page.tsx
export default function DashboardPage() {
  return <div>Dashboard placeholder — replaced in Task 17.</div>;
}
```

```tsx
// src/app/(admin)/admin/users/page.tsx
export default function AdminUsersPage() {
  return <div>Admin placeholder — replaced in Task 20.</div>;
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `pnpm test tests/integration/middleware.test.ts` (with `pnpm dev` running)
Expected: PASS (2 tests)

- [ ] **Step 6: Commit**

```bash
git add src/middleware.ts src/app/"(dashboard)" src/app/"(admin)" tests/integration/middleware.test.ts
git commit -m "feat: add middleware route protection and admin gating"
```

---

## Task 16: Redux Store & Toast System

**Files:**
- Create: `src/store/index.ts`
- Create: `src/store/slices/uiSlice.ts`
- Create: `src/store/StoreProvider.tsx`
- Create: `src/components/ui/toast.tsx`, `sonner.tsx` (via shadcn)
- Test: `src/store/slices/uiSlice.test.ts`
- Modify: `src/app/layout.tsx` (wrap children in `StoreProvider`)

**Interfaces:**
- Produces: `store`, `RootState`, `AppDispatch`; `uiSlice` actions `showToast({ message, variant })`, `dismissToast(id)`; selector `selectToasts(state): Toast[]`.

- [ ] **Step 1: Write the failing test**

```typescript
// src/store/slices/uiSlice.test.ts
import { describe, it, expect } from "vitest";
import uiReducer, { showToast, dismissToast } from "./uiSlice";

describe("uiSlice", () => {
  it("showToast adds a toast with a generated id", () => {
    const state = uiReducer(undefined, showToast({ message: "Saved", variant: "success" }));
    expect(state.toasts).toHaveLength(1);
    expect(state.toasts[0].message).toBe("Saved");
    expect(state.toasts[0].id).toBeDefined();
  });

  it("dismissToast removes the toast by id", () => {
    let state = uiReducer(undefined, showToast({ message: "Saved", variant: "success" }));
    const id = state.toasts[0].id;
    state = uiReducer(state, dismissToast(id));
    expect(state.toasts).toHaveLength(0);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test src/store/slices/uiSlice.test.ts`
Expected: FAIL — module not found

- [ ] **Step 3: Implement `src/store/slices/uiSlice.ts`**

```typescript
import { createSlice, nanoid, type PayloadAction } from "@reduxjs/toolkit";

export interface Toast {
  id: string;
  message: string;
  variant: "success" | "error" | "info";
}

interface UiState {
  toasts: Toast[];
  sidebarCollapsed: boolean;
}

const initialState: UiState = { toasts: [], sidebarCollapsed: false };

const uiSlice = createSlice({
  name: "ui",
  initialState,
  reducers: {
    showToast: {
      reducer(state, action: PayloadAction<Toast>) {
        state.toasts.push(action.payload);
      },
      prepare(payload: { message: string; variant: Toast["variant"] }) {
        return { payload: { id: nanoid(), ...payload } };
      },
    },
    dismissToast(state, action: PayloadAction<string>) {
      state.toasts = state.toasts.filter((t) => t.id !== action.payload);
    },
    toggleSidebar(state) {
      state.sidebarCollapsed = !state.sidebarCollapsed;
    },
  },
});

export const { showToast, dismissToast, toggleSidebar } = uiSlice.actions;
export default uiSlice.reducer;
export const selectToasts = (state: { ui: UiState }) => state.ui.toasts;
```

```bash
pnpm add @reduxjs/toolkit react-redux
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test src/store/slices/uiSlice.test.ts`
Expected: PASS (2 tests)

- [ ] **Step 5: Implement `src/store/index.ts`**

```typescript
import { configureStore } from "@reduxjs/toolkit";
import uiReducer from "./slices/uiSlice";

export const store = configureStore({
  reducer: {
    ui: uiReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
```

- [ ] **Step 6: Implement `src/store/StoreProvider.tsx`**

```tsx
"use client";

import { Provider } from "react-redux";
import { store } from "./index";

export function StoreProvider({ children }: { children: React.ReactNode }) {
  return <Provider store={store}>{children}</Provider>;
}
```

- [ ] **Step 7: Wrap the root layout and add the toast renderer**

```tsx
// src/app/layout.tsx (modify)
import { StoreProvider } from "@/store/StoreProvider";
import { ToastViewport } from "@/components/features/ToastViewport";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <StoreProvider>
          {children}
          <ToastViewport />
        </StoreProvider>
      </body>
    </html>
  );
}
```

```tsx
// src/components/features/ToastViewport.tsx
"use client";

import { useSelector, useDispatch } from "react-redux";
import { selectToasts, dismissToast } from "@/store/slices/uiSlice";

export function ToastViewport() {
  const toasts = useSelector(selectToasts);
  const dispatch = useDispatch();

  return (
    <div className="fixed bottom-4 right-4 space-y-2">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          role="status"
          className={`rounded-md px-4 py-2 text-sm text-white shadow ${
            toast.variant === "error" ? "bg-red-600" : toast.variant === "success" ? "bg-green-600" : "bg-gray-800"
          }`}
          onClick={() => dispatch(dismissToast(toast.id))}
        >
          {toast.message}
        </div>
      ))}
    </div>
  );
}
```

- [ ] **Step 8: Commit**

```bash
git add src/store src/app/layout.tsx src/components/features/ToastViewport.tsx
git commit -m "feat: add Redux store and toast notification system"
```

---

## Task 17: Landing Page

**Files:**
- Create: `src/components/layout/Header.tsx`, `src/components/layout/Footer.tsx`
- Create: `src/app/(marketing)/layout.tsx`
- Create: `src/app/(marketing)/page.tsx`

UI-only task, build-then-verify.

- [ ] **Step 1: Implement `Header.tsx`** — logo/site name (left), nav links, "Log in" and "Sign up" buttons (right), linking to `/login` and `/signup`.

- [ ] **Step 2: Implement `Footer.tsx`** — copyright line + placeholder links (About, Privacy, Terms).

- [ ] **Step 3: Implement `src/app/(marketing)/layout.tsx`** wrapping children with `Header` and `Footer`.

- [ ] **Step 4: Implement `src/app/(marketing)/page.tsx`** with a Hero section (headline, subheadline, primary CTA button to `/signup`, secondary link to `/login`), a Features section (3-4 generic placeholder `Card`s), and a bottom CTA section repeating the signup prompt. Use Tailwind utility classes for a responsive layout (stacked on mobile, grid on `md:`).

- [ ] **Step 5: Build and manually verify**

Run: `pnpm dev`, visit `http://localhost:3000/`, resize the viewport to confirm responsive behavior, click through to `/login` and `/signup`.

- [ ] **Step 6: Commit**

```bash
git add src/components/layout src/app/"(marketing)"
git commit -m "feat: add landing page"
```

---

## Task 18: Dashboard Shell & Settings Page

**Files:**
- Create: `src/lib/db/users.ts`
- Test: `src/lib/db/users.test.ts`
- Create: `src/lib/services/userService.ts`
- Test: `src/lib/services/userService.test.ts`
- Create: `src/components/layout/DashboardShell.tsx`
- Create: `src/app/(dashboard)/layout.tsx`
- Modify: `src/app/(dashboard)/dashboard/page.tsx` (replace Task 15 placeholder)
- Create: `src/components/features/auth/ChangePasswordForm.tsx`
- Create: `src/app/(dashboard)/settings/page.tsx`
- Create: `src/app/(dashboard)/actions.ts`

**Interfaces:**
- Produces: `getUserProfile(supabase, userId): Promise<UserProfile>`, `updateUserProfile(supabase, userId, input: { firstName: string; lastName: string }): Promise<void>` in `lib/db/users.ts`; `userService.getProfile`, `userService.updateProfile` wrapping them with permission checks (self-only).

- [ ] **Step 1: Write the failing test for `lib/db/users.ts`**

```typescript
// src/lib/db/users.test.ts
import { describe, it, expect, vi } from "vitest";
import { getUserById, updateUser } from "./users";

function makeSupabaseMock(row: any) {
  const single = vi.fn().mockResolvedValue({ data: row, error: null });
  const eq = vi.fn().mockReturnValue({ single });
  const select = vi.fn().mockReturnValue({ eq });
  const updateEq = vi.fn().mockResolvedValue({ error: null });
  const update = vi.fn().mockReturnValue({ eq: updateEq });
  return { from: vi.fn().mockReturnValue({ select, update }) } as any;
}

describe("db/users", () => {
  it("getUserById selects by id and returns the row", async () => {
    const supabase = makeSupabaseMock({ id: "u1", first_name: "Ada", last_name: "Lovelace" });
    const result = await getUserById(supabase, "u1");
    expect(result).toEqual({ id: "u1", first_name: "Ada", last_name: "Lovelace" });
    expect(supabase.from).toHaveBeenCalledWith("users");
  });

  it("updateUser updates the row by id", async () => {
    const supabase = makeSupabaseMock({});
    await updateUser(supabase, "u1", { first_name: "Grace", last_name: "Hopper" });
    expect(supabase.from).toHaveBeenCalledWith("users");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test src/lib/db/users.test.ts`
Expected: FAIL — module not found

- [ ] **Step 3: Implement `src/lib/db/users.ts`**

```typescript
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";

type UserRow = Database["public"]["Tables"]["users"]["Row"];

export async function getUserById(supabase: SupabaseClient<Database>, id: string): Promise<UserRow> {
  const { data, error } = await supabase.from("users").select("*").eq("id", id).single();
  if (error) throw error;
  return data;
}

export async function updateUser(
  supabase: SupabaseClient<Database>,
  id: string,
  fields: Partial<Pick<UserRow, "first_name" | "last_name">>
): Promise<void> {
  const { error } = await supabase.from("users").update(fields).eq("id", id);
  if (error) throw error;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test src/lib/db/users.test.ts`
Expected: PASS (2 tests)

- [ ] **Step 5: Write the failing test for `userService`**

```typescript
// src/lib/services/userService.test.ts
import { describe, it, expect, vi } from "vitest";

vi.mock("@/lib/db/users", () => ({
  getUserById: vi.fn().mockResolvedValue({ id: "u1", first_name: "Ada", last_name: "Lovelace" }),
  updateUser: vi.fn().mockResolvedValue(undefined),
}));

import { getProfile, updateProfile } from "./userService";
import { updateUser } from "@/lib/db/users";
import { ForbiddenError } from "@/lib/errors/AppError";

describe("userService", () => {
  it("getProfile returns the caller's own profile", async () => {
    const result = await getProfile({} as any, "u1", "u1");
    expect(result.id).toBe("u1");
  });

  it("updateProfile throws ForbiddenError when updating someone else's profile", async () => {
    await expect(updateProfile({} as any, "u1", "u2", { firstName: "X", lastName: "Y" })).rejects.toThrow(ForbiddenError);
  });

  it("updateProfile updates when the caller owns the profile", async () => {
    await updateProfile({} as any, "u1", "u1", { firstName: "Grace", lastName: "Hopper" });
    expect(updateUser).toHaveBeenCalledWith({}, "u1", { first_name: "Grace", last_name: "Hopper" });
  });
});
```

- [ ] **Step 6: Run test to verify it fails**

Run: `pnpm test src/lib/services/userService.test.ts`
Expected: FAIL — module not found

- [ ] **Step 7: Implement `src/lib/services/userService.ts`**

```typescript
import type { SupabaseClient } from "@supabase/supabase-js";
import { getUserById, updateUser } from "@/lib/db/users";
import { ForbiddenError } from "@/lib/errors/AppError";

export async function getProfile(supabase: SupabaseClient, callerId: string, targetId: string) {
  if (callerId !== targetId) throw new ForbiddenError("Cannot view another user's profile");
  return getUserById(supabase, targetId);
}

export async function updateProfile(
  supabase: SupabaseClient,
  callerId: string,
  targetId: string,
  input: { firstName: string; lastName: string }
): Promise<void> {
  if (callerId !== targetId) throw new ForbiddenError("Cannot update another user's profile");
  await updateUser(supabase, targetId, { first_name: input.firstName, last_name: input.lastName });
}
```

- [ ] **Step 8: Run test to verify it passes**

Run: `pnpm test src/lib/services/userService.test.ts`
Expected: PASS (3 tests)

- [ ] **Step 9: Implement `DashboardShell.tsx`, `(dashboard)/layout.tsx`** (sidebar with links: Dashboard, Settings, Notifications, Logout button calling `logoutAction`) and **`(dashboard)/dashboard/page.tsx`** (fetches the current user via `createServerSupabaseClient()` + `getProfile`, renders a welcome message and a user-info card).

- [ ] **Step 10: Implement `ChangePasswordForm.tsx`** (same react-hook-form pattern as `LoginForm`, using `changePasswordSchema`/`changePasswordAction`).

- [ ] **Step 11: Implement `src/app/(dashboard)/actions.ts`** with an `updateProfileAction(formData)` Server Action calling `userService.updateProfile`, and **`src/app/(dashboard)/settings/page.tsx`** with a profile-edit form and the `ChangePasswordForm`.

- [ ] **Step 12: Build and manually verify**

Run: `pnpm dev`, log in, visit `/dashboard` and `/settings`, edit profile fields and change password, confirm toasts fire via the `uiSlice`/`ToastViewport` on success.

- [ ] **Step 13: Commit**

```bash
git add src/lib/db/users.ts src/lib/db/users.test.ts src/lib/services/userService.ts src/lib/services/userService.test.ts src/components/layout/DashboardShell.tsx src/app/"(dashboard)"
git commit -m "feat: add dashboard shell, profile settings, change password"
```

---

## Task 19: File Storage Module (Avatar Upload)

**Files:**
- Create: `src/lib/db/files.ts`
- Test: `src/lib/db/files.test.ts`
- Create: `src/lib/services/fileService.ts`
- Test: `src/lib/services/fileService.test.ts`
- Create: `src/components/features/settings/AvatarUpload.tsx`
- Modify: `src/app/(dashboard)/settings/page.tsx` (add `AvatarUpload`)
- Modify: `src/app/(dashboard)/actions.ts` (add `uploadAvatarAction`)
- Modify: `supabase/config.toml` or a new migration to create the `avatars` Storage bucket

**Interfaces:**
- Produces: `insertFile(supabase, row): Promise<FileRow>`, `deleteFile(supabase, id): Promise<void>` in `lib/db/files.ts`; `fileService.uploadAvatar(supabase, userId, file: File): Promise<{ path: string }>`.

- [ ] **Step 1: Write the failing test for `lib/db/files.ts`**

```typescript
// src/lib/db/files.test.ts
import { describe, it, expect, vi } from "vitest";
import { insertFileRecord, deleteFileRecord } from "./files";

function makeSupabaseMock() {
  const single = vi.fn().mockResolvedValue({ data: { id: "f1", path: "avatars/u1.png" }, error: null });
  const select = vi.fn().mockReturnValue({ single });
  const insert = vi.fn().mockReturnValue({ select });
  const eq = vi.fn().mockResolvedValue({ error: null });
  const del = vi.fn().mockReturnValue({ eq });
  return { from: vi.fn().mockReturnValue({ insert, delete: del }) } as any;
}

describe("db/files", () => {
  it("insertFileRecord inserts and returns the row", async () => {
    const supabase = makeSupabaseMock();
    const result = await insertFileRecord(supabase, {
      owner_id: "u1",
      bucket: "avatars",
      path: "avatars/u1.png",
      filename: "u1.png",
      mime_type: "image/png",
      size_bytes: 1024,
    });
    expect(result.id).toBe("f1");
  });

  it("deleteFileRecord deletes by id", async () => {
    const supabase = makeSupabaseMock();
    await deleteFileRecord(supabase, "f1");
    expect(supabase.from).toHaveBeenCalledWith("files");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test src/lib/db/files.test.ts`
Expected: FAIL — module not found

- [ ] **Step 3: Implement `src/lib/db/files.ts`**

```typescript
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";

type FileInsert = Database["public"]["Tables"]["files"]["Insert"];
type FileRow = Database["public"]["Tables"]["files"]["Row"];

export async function insertFileRecord(supabase: SupabaseClient<Database>, row: FileInsert): Promise<FileRow> {
  const { data, error } = await supabase.from("files").insert(row).select().single();
  if (error) throw error;
  return data;
}

export async function deleteFileRecord(supabase: SupabaseClient<Database>, id: string): Promise<void> {
  const { error } = await supabase.from("files").delete().eq("id", id);
  if (error) throw error;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test src/lib/db/files.test.ts`
Expected: PASS (2 tests)

- [ ] **Step 5: Write the failing test for `fileService`**

```typescript
// src/lib/services/fileService.test.ts
import { describe, it, expect, vi } from "vitest";

vi.mock("@/lib/db/files", () => ({
  insertFileRecord: vi.fn().mockResolvedValue({ id: "f1", path: "avatars/u1-123.png" }),
}));

import { uploadAvatar } from "./fileService";

describe("fileService.uploadAvatar", () => {
  it("uploads to the avatars bucket and records the file", async () => {
    const upload = vi.fn().mockResolvedValue({ data: { path: "avatars/u1-123.png" }, error: null });
    const supabase = { storage: { from: vi.fn().mockReturnValue({ upload }) } } as any;
    const file = new File(["fake-bytes"], "avatar.png", { type: "image/png" });

    const result = await uploadAvatar(supabase, "u1", file);

    expect(supabase.storage.from).toHaveBeenCalledWith("avatars");
    expect(result.path).toBe("avatars/u1-123.png");
  });

  it("rejects files larger than 5MB", async () => {
    const supabase = { storage: { from: vi.fn() } } as any;
    const bigFile = new File([new Uint8Array(6 * 1024 * 1024)], "big.png", { type: "image/png" });
    await expect(uploadAvatar(supabase, "u1", bigFile)).rejects.toThrow();
  });
});
```

- [ ] **Step 6: Run test to verify it fails**

Run: `pnpm test src/lib/services/fileService.test.ts`
Expected: FAIL — module not found

- [ ] **Step 7: Implement `src/lib/services/fileService.ts`**

```typescript
import type { SupabaseClient } from "@supabase/supabase-js";
import { insertFileRecord } from "@/lib/db/files";
import { ValidationError } from "@/lib/errors/AppError";

const MAX_AVATAR_BYTES = 5 * 1024 * 1024;

export async function uploadAvatar(supabase: SupabaseClient, userId: string, file: File): Promise<{ path: string }> {
  if (file.size > MAX_AVATAR_BYTES) {
    throw new ValidationError("Avatar must be 5MB or smaller");
  }

  const path = `${userId}-${Date.now()}.${file.name.split(".").pop()}`;
  const { data, error } = await supabase.storage.from("avatars").upload(path, file, { upsert: true });
  if (error) throw error;

  await insertFileRecord(supabase, {
    owner_id: userId,
    bucket: "avatars",
    path: data.path,
    filename: file.name,
    mime_type: file.type,
    size_bytes: file.size,
  });

  return { path: data.path };
}
```

- [ ] **Step 8: Run test to verify it passes**

Run: `pnpm test src/lib/services/fileService.test.ts`
Expected: PASS (2 tests)

- [ ] **Step 9: Create the `avatars` bucket migration**

```sql
-- supabase/migrations/0003_avatars_bucket.sql
insert into storage.buckets (id, name, public) values ('avatars', 'avatars', true)
on conflict (id) do nothing;

create policy "avatar owner upload" on storage.objects
  for insert with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
```

Note: adjust the path convention in `fileService.uploadAvatar` to prefix with the user id folder (`${userId}/${Date.now()}.ext`) so this policy's `foldername` check matches.

- [ ] **Step 10: Apply migration**

Run: `pnpm supabase db reset && pnpm supabase gen types typescript --local > src/lib/supabase/database.types.ts`

- [ ] **Step 11: Implement `AvatarUpload.tsx` and wire `uploadAvatarAction`**, add to the Settings page.

- [ ] **Step 12: Build and manually verify**

Run: `pnpm dev`, log in, go to `/settings`, upload an avatar image, confirm it appears and a `files` row was created (check via `pnpm supabase studio` or `select * from files;`).

- [ ] **Step 13: Commit**

```bash
git add supabase/migrations src/lib/db/files.ts src/lib/db/files.test.ts src/lib/services/fileService.ts src/lib/services/fileService.test.ts src/components/features/settings src/app/"(dashboard)"
git commit -m "feat: add generic file storage module with avatar upload"
```

---

## Task 20: Notification Center

**Files:**
- Create: `src/lib/db/notifications.ts`
- Test: `src/lib/db/notifications.test.ts`
- Create: `src/lib/services/notificationService.ts`
- Test: `src/lib/services/notificationService.test.ts`
- Create: `src/store/api/notificationsApi.ts`
- Create: `src/components/features/notifications/NotificationBell.tsx`
- Create: `src/app/(dashboard)/notifications/page.tsx`
- Create: `src/app/api/notifications/route.ts`, `src/app/api/notifications/[id]/read/route.ts`
- Modify: `src/store/index.ts` (add `notificationsApi.reducer` + middleware)
- Modify: `src/components/layout/DashboardShell.tsx` (add `NotificationBell`)

**Interfaces:**
- Produces: `listNotifications(supabase, userId): Promise<NotificationRow[]>`, `markAsRead(supabase, id): Promise<void>` in `lib/db`; `notificationService.notifyUser(adminSupabase, recipientId, { type, title, message }): Promise<void>` (service-role only — used by other services, e.g. adminService in Task 21); `notificationsApi` RTK Query slice with `useListNotificationsQuery`, `useMarkAsReadMutation`.

- [ ] **Step 1: Write the failing test for `lib/db/notifications.ts`**

```typescript
// src/lib/db/notifications.test.ts
import { describe, it, expect, vi } from "vitest";
import { listNotificationsForUser, markNotificationRead, insertNotification } from "./notifications";

describe("db/notifications", () => {
  it("listNotificationsForUser queries by recipient_id ordered by created_at desc", async () => {
    const order = vi.fn().mockResolvedValue({ data: [{ id: "n1" }], error: null });
    const eq = vi.fn().mockReturnValue({ order });
    const select = vi.fn().mockReturnValue({ eq });
    const supabase = { from: vi.fn().mockReturnValue({ select }) } as any;

    const result = await listNotificationsForUser(supabase, "u1");

    expect(supabase.from).toHaveBeenCalledWith("notifications");
    expect(eq).toHaveBeenCalledWith("recipient_id", "u1");
    expect(result).toEqual([{ id: "n1" }]);
  });

  it("markNotificationRead sets read_at", async () => {
    const eq = vi.fn().mockResolvedValue({ error: null });
    const update = vi.fn().mockReturnValue({ eq });
    const supabase = { from: vi.fn().mockReturnValue({ update }) } as any;

    await markNotificationRead(supabase, "n1");

    expect(update).toHaveBeenCalledWith(expect.objectContaining({ read_at: expect.any(String) }));
  });

  it("insertNotification inserts a row", async () => {
    const insert = vi.fn().mockResolvedValue({ error: null });
    const supabase = { from: vi.fn().mockReturnValue({ insert }) } as any;

    await insertNotification(supabase, { recipient_id: "u1", type: "test", title: "Hi", message: "Hello" });

    expect(insert).toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test src/lib/db/notifications.test.ts`
Expected: FAIL — module not found

- [ ] **Step 3: Implement `src/lib/db/notifications.ts`**

```typescript
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";

type NotificationRow = Database["public"]["Tables"]["notifications"]["Row"];
type NotificationInsert = Database["public"]["Tables"]["notifications"]["Insert"];

export async function listNotificationsForUser(supabase: SupabaseClient<Database>, userId: string): Promise<NotificationRow[]> {
  const { data, error } = await supabase.from("notifications").select("*").eq("recipient_id", userId).order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function markNotificationRead(supabase: SupabaseClient<Database>, id: string): Promise<void> {
  const { error } = await supabase.from("notifications").update({ read_at: new Date().toISOString() }).eq("id", id);
  if (error) throw error;
}

export async function insertNotification(supabase: SupabaseClient<Database>, row: NotificationInsert): Promise<void> {
  const { error } = await supabase.from("notifications").insert(row);
  if (error) throw error;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test src/lib/db/notifications.test.ts`
Expected: PASS (3 tests)

- [ ] **Step 5: Write the failing test for `notificationService`**

```typescript
// src/lib/services/notificationService.test.ts
import { describe, it, expect, vi } from "vitest";

vi.mock("@/lib/db/notifications", () => ({
  insertNotification: vi.fn().mockResolvedValue(undefined),
}));

import { notifyUser } from "./notificationService";
import { insertNotification } from "@/lib/db/notifications";

describe("notificationService.notifyUser", () => {
  it("inserts a notification for the recipient", async () => {
    await notifyUser({} as any, "u1", { type: "account", title: "Welcome", message: "Thanks for joining" });
    expect(insertNotification).toHaveBeenCalledWith({}, {
      recipient_id: "u1",
      type: "account",
      title: "Welcome",
      message: "Thanks for joining",
    });
  });
});
```

- [ ] **Step 6: Run test to verify it fails**

Run: `pnpm test src/lib/services/notificationService.test.ts`
Expected: FAIL — module not found

- [ ] **Step 7: Implement `src/lib/services/notificationService.ts`**

```typescript
import type { SupabaseClient } from "@supabase/supabase-js";
import { insertNotification } from "@/lib/db/notifications";

export async function notifyUser(
  adminSupabase: SupabaseClient,
  recipientId: string,
  input: { type: string; title: string; message: string }
): Promise<void> {
  await insertNotification(adminSupabase, {
    recipient_id: recipientId,
    type: input.type,
    title: input.title,
    message: input.message,
  });
}
```

- [ ] **Step 8: Run test to verify it passes**

Run: `pnpm test src/lib/services/notificationService.test.ts`
Expected: PASS

- [ ] **Step 9: Implement the Route Handlers**

```typescript
// src/app/api/notifications/route.ts
import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { listNotificationsForUser } from "@/lib/db/notifications";
import { mapErrorToResponse } from "@/lib/errors/AppError";

export async function GET() {
  try {
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

    const notifications = await listNotificationsForUser(supabase, user.id);
    return NextResponse.json(notifications);
  } catch (err) {
    const { status, body } = mapErrorToResponse(err);
    return NextResponse.json(body, { status });
  }
}
```

```typescript
// src/app/api/notifications/[id]/read/route.ts
import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { markNotificationRead } from "@/lib/db/notifications";
import { mapErrorToResponse } from "@/lib/errors/AppError";

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const supabase = await createServerSupabaseClient();
    await markNotificationRead(supabase, id);
    return NextResponse.json({ success: true });
  } catch (err) {
    const { status, body } = mapErrorToResponse(err);
    return NextResponse.json(body, { status });
  }
}
```

- [ ] **Step 10: Implement `src/store/api/notificationsApi.ts`**

```typescript
import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";

export interface NotificationDto {
  id: string;
  type: string;
  title: string;
  message: string;
  read_at: string | null;
  created_at: string;
}

export const notificationsApi = createApi({
  reducerPath: "notificationsApi",
  baseQuery: fetchBaseQuery({ baseUrl: "/api" }),
  tagTypes: ["Notification"],
  endpoints: (builder) => ({
    listNotifications: builder.query<NotificationDto[], void>({
      query: () => "/notifications",
      providesTags: ["Notification"],
    }),
    markAsRead: builder.mutation<{ success: boolean }, string>({
      query: (id) => ({ url: `/notifications/${id}/read`, method: "POST" }),
      invalidatesTags: ["Notification"],
    }),
  }),
});

export const { useListNotificationsQuery, useMarkAsReadMutation } = notificationsApi;
```

- [ ] **Step 11: Wire into the store**

```typescript
// src/store/index.ts (modify)
import { configureStore } from "@reduxjs/toolkit";
import uiReducer from "./slices/uiSlice";
import { notificationsApi } from "./api/notificationsApi";

export const store = configureStore({
  reducer: {
    ui: uiReducer,
    [notificationsApi.reducerPath]: notificationsApi.reducer,
  },
  middleware: (getDefault) => getDefault().concat(notificationsApi.middleware),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
```

- [ ] **Step 12: Implement `NotificationBell.tsx`** using `useListNotificationsQuery`/`useMarkAsReadMutation`, showing an unread-count badge and a dropdown list; add to `DashboardShell.tsx`. Implement `/notifications/page.tsx` as the full list view.

- [ ] **Step 13: Build and manually verify**

Run: `pnpm dev`, manually insert a test notification row via `pnpm supabase studio`, confirm it appears in the bell dropdown and `/notifications`, and that marking it read updates the badge.

- [ ] **Step 14: Commit**

```bash
git add src/lib/db/notifications.ts src/lib/db/notifications.test.ts src/lib/services/notificationService.ts src/lib/services/notificationService.test.ts src/store/api/notificationsApi.ts src/store/index.ts src/app/api/notifications src/components/features/notifications src/app/"(dashboard)"/notifications src/components/layout/DashboardShell.tsx
git commit -m "feat: add in-app notification center"
```

---

## Task 21: Admin User Management Panel

**Files:**
- Create: `src/lib/db/auditLog.ts`
- Test: `src/lib/db/auditLog.test.ts`
- Create: `src/lib/services/adminService.ts`
- Test: `src/lib/services/adminService.test.ts`
- Create: `src/store/api/adminApi.ts`
- Create: `src/components/features/admin/UsersTable.tsx`, `UserDetailPanel.tsx`
- Create: `src/app/(admin)/admin/users/page.tsx` (replace Task 15 placeholder)
- Create: `src/app/(admin)/admin/users/[id]/page.tsx`
- Create: `src/app/api/admin/users/route.ts`, `src/app/api/admin/users/[id]/route.ts`
- Modify: `src/store/index.ts` (add `adminApi`)

**Interfaces:**
- Produces: `adminService.listUsers(supabase, callerId, { search, page }): Promise<{ users: UserRow[]; total: number }>`, `adminService.changeUserRole(supabase, callerId, targetId, roleName: string): Promise<void>`, `adminService.setAccountStatus(supabase, callerId, targetId, status: "active" | "suspended"): Promise<void>` — every mutation calls `requirePermission(supabase, callerId, "users:write" | "users:suspend")`, writes an `audit_log` row, and calls `notificationService.notifyUser`.

- [ ] **Step 1: Write the failing test for `lib/db/auditLog.ts`**

```typescript
// src/lib/db/auditLog.test.ts
import { describe, it, expect, vi } from "vitest";
import { insertAuditLog } from "./auditLog";

describe("db/auditLog", () => {
  it("inserts an audit_log row", async () => {
    const insert = vi.fn().mockResolvedValue({ error: null });
    const supabase = { from: vi.fn().mockReturnValue({ insert }) } as any;

    await insertAuditLog(supabase, {
      actor_id: "admin-1",
      action: "user.role_changed",
      target_type: "user",
      target_id: "u1",
      metadata: { newRole: "admin" },
    });

    expect(supabase.from).toHaveBeenCalledWith("audit_log");
    expect(insert).toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test src/lib/db/auditLog.test.ts`
Expected: FAIL — module not found

- [ ] **Step 3: Implement `src/lib/db/auditLog.ts`**

```typescript
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";

type AuditLogInsert = Database["public"]["Tables"]["audit_log"]["Insert"];

export async function insertAuditLog(supabase: SupabaseClient<Database>, row: AuditLogInsert): Promise<void> {
  const { error } = await supabase.from("audit_log").insert(row);
  if (error) throw error;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test src/lib/db/auditLog.test.ts`
Expected: PASS

- [ ] **Step 5: Write the failing test for `adminService`**

```typescript
// src/lib/services/adminService.test.ts
import { describe, it, expect, vi } from "vitest";

vi.mock("@/lib/permissions", () => ({ requirePermission: vi.fn().mockResolvedValue(undefined) }));
vi.mock("@/lib/db/auditLog", () => ({ insertAuditLog: vi.fn().mockResolvedValue(undefined) }));
vi.mock("@/lib/services/notificationService", () => ({ notifyUser: vi.fn().mockResolvedValue(undefined) }));

import { setAccountStatus } from "./adminService";
import { requirePermission } from "@/lib/permissions";
import { insertAuditLog } from "@/lib/db/auditLog";
import { notifyUser } from "@/lib/services/notificationService";

describe("adminService.setAccountStatus", () => {
  it("requires users:suspend, updates status, logs, and notifies the target", async () => {
    const eq = vi.fn().mockResolvedValue({ error: null });
    const update = vi.fn().mockReturnValue({ eq });
    const supabase = { from: vi.fn().mockReturnValue({ update }) } as any;

    await setAccountStatus(supabase, "admin-1", "u1", "suspended");

    expect(requirePermission).toHaveBeenCalledWith(supabase, "admin-1", "users:suspend");
    expect(update).toHaveBeenCalledWith({ account_status: "suspended" });
    expect(insertAuditLog).toHaveBeenCalledWith(
      supabase,
      expect.objectContaining({ actor_id: "admin-1", target_id: "u1", action: "user.status_changed" })
    );
    expect(notifyUser).toHaveBeenCalledWith(supabase, "u1", expect.objectContaining({ type: "account_status" }));
  });
});
```

- [ ] **Step 6: Run test to verify it fails**

Run: `pnpm test src/lib/services/adminService.test.ts`
Expected: FAIL — module not found

- [ ] **Step 7: Implement `src/lib/services/adminService.ts`**

```typescript
import type { SupabaseClient } from "@supabase/supabase-js";
import { requirePermission } from "@/lib/permissions";
import { insertAuditLog } from "@/lib/db/auditLog";
import { notifyUser } from "@/lib/services/notificationService";

export async function listUsers(
  supabase: SupabaseClient,
  callerId: string,
  options: { search?: string; page: number; pageSize?: number }
) {
  await requirePermission(supabase, callerId, "users:read");
  const pageSize = options.pageSize ?? 20;
  const from = (options.page - 1) * pageSize;
  const to = from + pageSize - 1;

  let query = supabase.from("users").select("*", { count: "exact" }).range(from, to);
  if (options.search) {
    query = query.or(`email.ilike.%${options.search}%,first_name.ilike.%${options.search}%,last_name.ilike.%${options.search}%`);
  }

  const { data, count, error } = await query;
  if (error) throw error;
  return { users: data ?? [], total: count ?? 0 };
}

export async function changeUserRole(supabase: SupabaseClient, callerId: string, targetId: string, roleName: string): Promise<void> {
  await requirePermission(supabase, callerId, "users:write");

  const { data: role, error: roleError } = await supabase.from("roles").select("id").eq("name", roleName).single();
  if (roleError || !role) throw roleError ?? new Error("Unknown role");

  await supabase.from("user_roles").delete().eq("user_id", targetId);
  const { error } = await supabase.from("user_roles").insert({ user_id: targetId, role_id: role.id });
  if (error) throw error;

  await insertAuditLog(supabase, {
    actor_id: callerId,
    action: "user.role_changed",
    target_type: "user",
    target_id: targetId,
    metadata: { newRole: roleName },
  });
  await notifyUser(supabase, targetId, {
    type: "account_role",
    title: "Your role was updated",
    message: `Your account role was changed to ${roleName}.`,
  });
}

export async function setAccountStatus(
  supabase: SupabaseClient,
  callerId: string,
  targetId: string,
  status: "active" | "suspended"
): Promise<void> {
  await requirePermission(supabase, callerId, "users:suspend");

  const { error } = await supabase.from("users").update({ account_status: status }).eq("id", targetId);
  if (error) throw error;

  await insertAuditLog(supabase, {
    actor_id: callerId,
    action: "user.status_changed",
    target_type: "user",
    target_id: targetId,
    metadata: { newStatus: status },
  });
  await notifyUser(supabase, targetId, {
    type: "account_status",
    title: status === "suspended" ? "Your account was suspended" : "Your account was reactivated",
    message: status === "suspended" ? "Contact support if you believe this is a mistake." : "Welcome back!",
  });
}
```

- [ ] **Step 8: Run test to verify it passes**

Run: `pnpm test src/lib/services/adminService.test.ts`
Expected: PASS

- [ ] **Step 9: Implement the admin Route Handlers** (`GET /api/admin/users?search=&page=`, `PATCH /api/admin/users/[id]` accepting `{ role? , status? }`), each authenticating the caller via `createServerSupabaseClient()` + `supabase.auth.getUser()` and delegating to `adminService`, mapping errors via `mapErrorToResponse`.

- [ ] **Step 10: Implement `src/store/api/adminApi.ts`** (RTK Query: `useListUsersQuery({ search, page })`, `useChangeRoleMutation`, `useSetStatusMutation`), wire into `src/store/index.ts` alongside `notificationsApi`.

- [ ] **Step 11: Implement `UsersTable.tsx`** (shadcn `DataTable` pattern: search input, paginated rows, status badge, click-through to detail) and `UserDetailPanel.tsx` (role selector, active/suspended toggle, both calling the RTK Query mutations and dispatching a toast via `uiSlice` on success/failure).

- [ ] **Step 12: Implement `(admin)/admin/users/page.tsx` and `(admin)/admin/users/[id]/page.tsx`**, replacing the Task 15 placeholder.

- [ ] **Step 13: Build and manually verify**

Run: `pnpm dev`. Manually promote a test user to `admin` via `pnpm supabase studio` (insert into `user_roles`), log in as that user, visit `/admin/users`, search, open a user, change their role and suspend/reactivate them; confirm an `audit_log` row and a `notifications` row are created each time, and that a non-admin visiting `/admin/users` is redirected to `/dashboard` (per Task 15's middleware).

- [ ] **Step 14: Commit**

```bash
git add src/lib/db/auditLog.ts src/lib/db/auditLog.test.ts src/lib/services/adminService.ts src/lib/services/adminService.test.ts src/store/api/adminApi.ts src/store/index.ts src/app/api/admin src/components/features/admin src/app/"(admin)"
git commit -m "feat: add admin user management panel with audit logging"
```

---

## Task 22: End-to-End Tests

**Files:**
- Create: `tests/e2e/auth-journey.spec.ts`
- Create: `tests/e2e/admin-journey.spec.ts`

**Interfaces:**
- Consumes: the running dev server + local Supabase instance (per `playwright.config.ts`'s `webServer`).

- [ ] **Step 1: Write `tests/e2e/auth-journey.spec.ts`**

```typescript
import { test, expect } from "@playwright/test";

test("signup, login, and dashboard access", async ({ page }) => {
  const email = `e2e-${Date.now()}@example.com`;

  await page.goto("/signup");
  await page.getByLabel("First name").fill("Ada");
  await page.getByLabel("Last name").fill("Lovelace");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password", { exact: true }).fill("correct-horse-1");
  await page.getByLabel("Confirm password").fill("correct-horse-1");
  await page.getByRole("button", { name: /sign up/i }).click();
  await expect(page.getByRole("status")).toContainText("verify your account");

  await page.goto("/dashboard");
  await expect(page).toHaveURL(/\/login/);
});

test("unauthenticated user is redirected away from the admin panel", async ({ page }) => {
  await page.goto("/admin/users");
  await expect(page).toHaveURL(/\/login/);
});
```

- [ ] **Step 2: Write `tests/e2e/admin-journey.spec.ts`**

```typescript
import { test, expect } from "@playwright/test";

// Assumes a seeded admin account exists in the local Supabase instance
// (seed via supabase/seed.sql: an admin@example.com user with the admin role).
test("admin can view and search the users table", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel("Email").fill("admin@example.com");
  await page.getByLabel("Password").fill("admin-password-1");
  await page.getByRole("button", { name: /log in/i }).click();

  await page.goto("/admin/users");
  await expect(page.getByRole("heading", { name: /users/i })).toBeVisible();
  await page.getByPlaceholder(/search/i).fill("admin");
  await expect(page.getByText("admin@example.com")).toBeVisible();
});
```

- [ ] **Step 3: Add a `supabase/seed.sql`** that creates the `admin@example.com` test account (via `auth.users` insert helpers or the Supabase CLI's seeding convention) and assigns the `admin` role, so the e2e suite is self-contained on `pnpm supabase db reset`.

- [ ] **Step 4: Run the e2e suite**

Run: `pnpm supabase db reset && pnpm test:e2e`
Expected: PASS (3 tests)

- [ ] **Step 5: Commit**

```bash
git add tests/e2e supabase/seed.sql
git commit -m "test: add e2e coverage for auth and admin journeys"
```

---

## Task 23: Documentation

**Files:**
- Create: `README.md`
- Create: `docs/architecture.md`
- Create: `docs/database.md`

- [ ] **Step 1: Write `README.md`** covering: project purpose (reusable foundation, not a finished product), prerequisites (Node, pnpm, Docker for local Supabase), install steps (`pnpm install`, `cp .env.example .env.local`, `pnpm supabase start`, `pnpm supabase db reset`, `pnpm dev`), how to run tests (`pnpm test`, `pnpm test:e2e`), and a link to `docs/architecture.md` and `docs/database.md`.

- [ ] **Step 2: Write `docs/architecture.md`** summarizing the layering from the design spec (Server Action → service → db layer, RLS as defense in depth), the folder structure table from Section 3 of the spec, and why each cross-cutting module (`lib/errors`, `lib/logger`, `lib/permissions`, `lib/rateLimit`, `lib/config`) exists as its own module.

- [ ] **Step 3: Write `docs/database.md`** listing every table from Tasks 6-7 with its columns and RLS policy summary, and the trigger that provisions `public.users`/`user_roles` on signup.

- [ ] **Step 4: Verify accuracy**

Read back through `docs/superpowers/specs/2026-07-27-foundation-design.md` and confirm every claim in the three new docs matches what was actually built (table names, env var names, script names in `package.json`).

- [ ] **Step 5: Commit**

```bash
git add README.md docs/architecture.md docs/database.md
git commit -m "docs: add README, architecture overview, database overview"
```

---

## Plan Self-Review Notes

- **Spec coverage:** every Section 2-11 item in the design spec maps to a task — stack/tooling (1), config/security (2-4), Supabase clients/schema (5-7), permissions/validation/rate-limit (8-10), auth service+actions+pages (11-14), middleware (15), state/toast (16), landing page (17), dashboard/settings (18), file storage (19), notifications (20), admin panel (21), testing (22), docs (23).
- **Type consistency:** `SupabaseClient<Database>` typing is introduced in Task 6 (once types are generated) and used consistently from Task 8 onward; service function signatures (`(supabase, callerId, ...)`) are consistent across `userService`, `adminService`, `fileService`, `notificationService`.
- **No placeholders:** every step has runnable code or an explicit shell command; the only forward reference is Task 15's dashboard/admin placeholder pages, which are explicitly replaced in Tasks 18 and 21.
