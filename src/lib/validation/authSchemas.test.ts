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
