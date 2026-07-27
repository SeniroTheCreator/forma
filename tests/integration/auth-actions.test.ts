// tests/integration/auth-actions.test.ts
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { createClient } from "@supabase/supabase-js";
import { signupAction, loginAction } from "@/app/(auth)/actions";
import { SUSPENDED_ACCOUNT_MESSAGE } from "@/lib/services/authService";

function formData(fields: Record<string, string>) {
  const fd = new FormData();
  Object.entries(fields).forEach(([k, v]) => fd.append(k, v));
  return fd;
}

const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
  auth: { autoRefreshToken: false, persistSession: false },
});

describe("auth Server Actions (integration, local Supabase)", () => {
  // Every account this suite really creates is deleted afterwards, so repeated local runs
  // don't silently accumulate `test-*@example.com` rows in the developer's database.
  const createdEmails: string[] = [];

  afterAll(async () => {
    for (const email of createdEmails) {
      const { data } = await admin.auth.admin.listUsers();
      const match = data?.users.find((u) => u.email === email);
      if (match) await admin.auth.admin.deleteUser(match.id);
    }
  });

  it("signupAction creates a user and returns no error for valid input", async () => {
    const email = `test-${Date.now()}@example.com`;
    createdEmails.push(email);
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

describe("loginAction account suspension enforcement (integration, local Supabase)", () => {
  const email = `login-suspend-${Date.now()}@example.com`;
  const password = "correct-horse-1";
  let userId: string;

  beforeAll(async () => {
    const { data, error } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { first_name: "Sus", last_name: "Pended" },
    });
    if (error || !data.user) throw error ?? new Error("could not create the test user");
    userId = data.user.id;
  });

  afterAll(async () => {
    if (userId) await admin.auth.admin.deleteUser(userId);
  });

  it("accepts the credentials while the account is active (control case)", async () => {
    const result = await loginAction(formData({ email, password }));
    expect(result.error).toBeUndefined();
  });

  it("records last_login_at against the id it just authenticated", async () => {
    const { data } = await admin.from("users").select("last_login_at").eq("id", userId).single();
    expect(data?.last_login_at).not.toBeNull();
  });

  it("rejects the same correct credentials once the account is suspended", async () => {
    const { error } = await admin.from("users").update({ account_status: "suspended" }).eq("id", userId);
    expect(error).toBeNull();

    const result = await loginAction(formData({ email, password }));
    expect(result.error).toBe(SUSPENDED_ACCOUNT_MESSAGE);
  });
});
