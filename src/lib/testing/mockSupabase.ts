import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Test-only helper. Not imported by any application code.
 *
 * Unit tests hand-roll partial Supabase clients — a `from()` that returns just the two or
 * three chained builder methods the code under test actually calls, an `auth` with only
 * the relevant vi.fn()s, and so on. Building a structurally complete `SupabaseClient` for
 * each of those would be pages of noise, so every such mock used to end in `as any`, which
 * is what made `pnpm lint` fail with 23 `@typescript-eslint/no-explicit-any` errors.
 *
 * This narrows that to one deliberate, documented assertion in one place. The intersection
 * return type is the point: the value is accepted anywhere a `SupabaseClient` is expected,
 * *and* keeps the mock's own literal type, so `supabase.auth.signUp.mockResolvedValue(...)`
 * and `expect(supabase.from).toHaveBeenCalledWith(...)` still type-check at the call site
 * instead of decaying to `any`.
 *
 * Because the mock's real shape survives, a test that calls a method its mock does not
 * define still fails — at runtime, exactly as it did before, rather than being silently
 * typed away.
 */
export function mockSupabase<T extends object>(mock: T): T & SupabaseClient {
  return mock as unknown as T & SupabaseClient;
}
