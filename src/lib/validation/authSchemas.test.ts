import { describe, it, expect } from "vitest";
import {
  signupSchema,
  loginSchema,
  changePasswordSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
} from "./authSchemas";

describe("authSchemas", () => {
  describe("signupSchema", () => {
    it("rejects mismatched password confirmation", () => {
      const result = signupSchema.safeParse({
        firstName: "Ada",
        lastName: "Lovelace",
        email: "ada@example.com",
        password: "correct-horse-1",
        confirmPassword: "different",
      });
      expect(result.success).toBe(false);
    });

    it("accepts a valid payload", () => {
      const result = signupSchema.safeParse({
        firstName: "Ada",
        lastName: "Lovelace",
        email: "ada@example.com",
        password: "correct-horse-1",
        confirmPassword: "correct-horse-1",
      });
      expect(result.success).toBe(true);
    });

    it("rejects password shorter than 8 characters", () => {
      const result = signupSchema.safeParse({
        firstName: "Ada",
        lastName: "Lovelace",
        email: "ada@example.com",
        password: "short",
        confirmPassword: "short",
      });
      expect(result.success).toBe(false);
    });

    it("rejects invalid email address", () => {
      const result = signupSchema.safeParse({
        firstName: "Ada",
        lastName: "Lovelace",
        email: "not-an-email",
        password: "correct-horse-1",
        confirmPassword: "correct-horse-1",
      });
      expect(result.success).toBe(false);
    });
  });

  describe("loginSchema", () => {
    it("requires a valid email", () => {
      const result = loginSchema.safeParse({ email: "not-an-email", password: "x" });
      expect(result.success).toBe(false);
    });
  });

  describe("forgotPasswordSchema", () => {
    it("accepts a valid email", () => {
      const result = forgotPasswordSchema.safeParse({ email: "test@example.com" });
      expect(result.success).toBe(true);
    });

    it("rejects an invalid email", () => {
      const result = forgotPasswordSchema.safeParse({ email: "not-an-email" });
      expect(result.success).toBe(false);
    });
  });

  describe("resetPasswordSchema", () => {
    it("rejects mismatched password confirmation", () => {
      const result = resetPasswordSchema.safeParse({
        password: "correct-horse-1",
        confirmPassword: "different",
      });
      expect(result.success).toBe(false);
    });

    it("accepts valid matching password with 8+ characters", () => {
      const result = resetPasswordSchema.safeParse({
        password: "correct-horse-1",
        confirmPassword: "correct-horse-1",
      });
      expect(result.success).toBe(true);
    });
  });

  describe("changePasswordSchema", () => {
    it("requires 8+ char new password", () => {
      const result = changePasswordSchema.safeParse({
        currentPassword: "old-pass-1",
        newPassword: "short",
      });
      expect(result.success).toBe(false);
    });
  });
});
