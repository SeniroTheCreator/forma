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
