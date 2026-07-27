// tests/integration/proxy.test.ts
//
// Exercises src/proxy.ts through the real Next.js request pipeline (the only place it
// actually runs) against real local Supabase. The dev server is booted/torn down by
// tests/setup/devServer.ts (see vitest.config.ts's `integration` project).
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { createClient } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";

const BASE_URL = "http://localhost:3000";
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

/**
 * Turns a real GoTrue session into exactly the cookie set `@supabase/ssr` would have
 * written for it, by driving `createServerClient` with an in-memory cookie jar. Building
 * the cookie by hand would risk silently drifting from @supabase/ssr's chunking/encoding
 * format and producing a test that passes for the wrong reason (session not recognised ->
 * redirected to /login either way); the "active session reaches /dashboard" control case
 * below is what proves the session really is being recognised.
 */
async function sessionCookieHeader(accessToken: string, refreshToken: string): Promise<string> {
  const jar = new Map<string, string>();
  const client = createServerClient(SUPABASE_URL, ANON_KEY, {
    cookies: {
      getAll: () => [...jar].map(([name, value]) => ({ name, value })),
      setAll: (cookiesToSet) => {
        for (const { name, value } of cookiesToSet) {
          if (value === "") jar.delete(name);
          else jar.set(name, value);
        }
      },
    },
  });
  const { error } = await client.auth.setSession({ access_token: accessToken, refresh_token: refreshToken });
  if (error) throw error;
  if (jar.size === 0) throw new Error("no auth cookies were produced for the session");
  return [...jar].map(([name, value]) => `${name}=${encodeURIComponent(value)}`).join("; ");
}

describe("proxy route protection (integration, local Supabase + dev server)", () => {
  it("redirects unauthenticated requests to /dashboard to /login", async () => {
    const res = await fetch(`${BASE_URL}/dashboard`, { redirect: "manual" });
    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toContain("/login");
  });

  it("redirects unauthenticated requests to /admin/users to /login", async () => {
    const res = await fetch(`${BASE_URL}/admin/users`, { redirect: "manual" });
    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toContain("/login");
  });
});

describe("proxy account suspension enforcement (integration, local Supabase + dev server)", () => {
  const email = `proxy-suspend-${Date.now()}@example.com`;
  const password = "correct-horse-1";
  let userId: string;
  let cookieHeader: string;

  beforeAll(async () => {
    const { data, error } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { first_name: "Sus", last_name: "Pended" },
    });
    if (error || !data.user) throw error ?? new Error("could not create the test user");
    userId = data.user.id;

    const anon = createClient(SUPABASE_URL, ANON_KEY, { auth: { persistSession: false } });
    const { data: signIn, error: signInError } = await anon.auth.signInWithPassword({ email, password });
    if (signInError || !signIn.session) throw signInError ?? new Error("could not sign the test user in");

    cookieHeader = await sessionCookieHeader(signIn.session.access_token, signIn.session.refresh_token);
  });

  afterAll(async () => {
    if (userId) await admin.auth.admin.deleteUser(userId);
  });

  it("lets an ACTIVE user's session through to /dashboard (control case)", async () => {
    const res = await fetch(`${BASE_URL}/dashboard`, { redirect: "manual", headers: { cookie: cookieHeader } });
    expect(res.status).toBe(200);
  });

  it("redirects a SUSPENDED user's live session away from /dashboard to /login?suspended=1", async () => {
    const { error } = await admin.from("users").update({ account_status: "suspended" }).eq("id", userId);
    expect(error).toBeNull();

    const res = await fetch(`${BASE_URL}/dashboard`, { redirect: "manual", headers: { cookie: cookieHeader } });
    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toContain("/login");
    expect(res.headers.get("location")).toContain("suspended=1");
  });
});
