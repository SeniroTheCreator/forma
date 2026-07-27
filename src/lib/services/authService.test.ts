import { describe, it, expect, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/config/env", () => ({
  env: {
    NEXT_PUBLIC_SITE_URL: "http://localhost:3000",
  },
}));

import {
  signup,
  login,
  logout,
  resendVerificationEmail,
  forgotPassword,
  resetPassword,
  changePassword,
} from "./authService";
import { AuthError } from "@/lib/errors/AppError";
import { mockSupabase } from "@/lib/testing/mockSupabase";

function makeSupabaseMock() {
  return mockSupabase({
    auth: {
      signUp: vi.fn(),
      signInWithPassword: vi.fn(),
      signOut: vi.fn().mockResolvedValue({ error: null }),
      resend: vi.fn(),
      resetPasswordForEmail: vi.fn(),
      updateUser: vi.fn(),
      getUser: vi.fn(),
    },
  });
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

  it("signs the session back out after a successful signup (guards against local auto-confirm auto-login)", async () => {
    const supabase = makeSupabaseMock();
    supabase.auth.signUp.mockResolvedValue({ data: { user: { id: "user-1" } }, error: null });

    await signup(supabase, {
      firstName: "Ada",
      lastName: "Lovelace",
      email: "ada@example.com",
      password: "correct-horse-1",
      confirmPassword: "correct-horse-1",
    });

    expect(supabase.auth.signOut).toHaveBeenCalled();
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

  it("throws AuthError when Supabase returns an error", async () => {
    const supabase = makeSupabaseMock();
    supabase.auth.signOut.mockResolvedValue({ error: { message: "Session missing" } });

    await expect(logout(supabase)).rejects.toThrow(AuthError);
  });
});

describe("authService.resendVerificationEmail", () => {
  it("calls supabase.auth.resend with the signup type and email", async () => {
    const supabase = makeSupabaseMock();
    supabase.auth.resend.mockResolvedValue({ error: null });

    await resendVerificationEmail(supabase, "ada@example.com");

    expect(supabase.auth.resend).toHaveBeenCalledWith({ type: "signup", email: "ada@example.com" });
  });

  it("throws AuthError when Supabase returns an error", async () => {
    const supabase = makeSupabaseMock();
    supabase.auth.resend.mockResolvedValue({ error: { message: "Rate limit exceeded" } });

    await expect(resendVerificationEmail(supabase, "ada@example.com")).rejects.toThrow(AuthError);
  });
});

describe("authService.forgotPassword", () => {
  it("calls supabase.auth.resetPasswordForEmail with a redirectTo built from the site URL", async () => {
    const supabase = makeSupabaseMock();
    supabase.auth.resetPasswordForEmail.mockResolvedValue({ error: null });

    await forgotPassword(supabase, { email: "ada@example.com" });

    expect(supabase.auth.resetPasswordForEmail).toHaveBeenCalledWith("ada@example.com", {
      redirectTo: "http://localhost:3000/reset-password",
    });
  });

  it("throws AuthError when Supabase returns an error", async () => {
    const supabase = makeSupabaseMock();
    supabase.auth.resetPasswordForEmail.mockResolvedValue({ error: { message: "Something went wrong" } });

    await expect(forgotPassword(supabase, { email: "ada@example.com" })).rejects.toThrow(AuthError);
  });
});

describe("authService.resetPassword", () => {
  it("calls supabase.auth.updateUser with the new password", async () => {
    const supabase = makeSupabaseMock();
    supabase.auth.updateUser.mockResolvedValue({ error: null });

    await resetPassword(supabase, { password: "new-password-1", confirmPassword: "new-password-1" });

    expect(supabase.auth.updateUser).toHaveBeenCalledWith({ password: "new-password-1" });
  });

  it("throws AuthError when Supabase returns an error", async () => {
    const supabase = makeSupabaseMock();
    supabase.auth.updateUser.mockResolvedValue({ error: { message: "Reset link expired" } });

    await expect(
      resetPassword(supabase, { password: "new-password-1", confirmPassword: "new-password-1" })
    ).rejects.toThrow(AuthError);
  });
});

describe("authService.changePassword", () => {
  it("re-authenticates with the current password, then updates to the new password", async () => {
    const supabase = makeSupabaseMock();
    supabase.auth.getUser.mockResolvedValue({ data: { user: { email: "ada@example.com" } }, error: null });
    supabase.auth.signInWithPassword.mockResolvedValue({ data: { user: { id: "user-1" } }, error: null });
    supabase.auth.updateUser.mockResolvedValue({ error: null });

    await changePassword(supabase, { currentPassword: "old-password-1", newPassword: "new-password-1" });

    expect(supabase.auth.signInWithPassword).toHaveBeenCalledWith({
      email: "ada@example.com",
      password: "old-password-1",
    });
    expect(supabase.auth.updateUser).toHaveBeenCalledWith({ password: "new-password-1" });
  });

  it("throws AuthError and does not update the password when the current password is wrong", async () => {
    const supabase = makeSupabaseMock();
    supabase.auth.getUser.mockResolvedValue({ data: { user: { email: "ada@example.com" } }, error: null });
    supabase.auth.signInWithPassword.mockResolvedValue({
      data: { user: null },
      error: { message: "Invalid login credentials" },
    });

    await expect(
      changePassword(supabase, { currentPassword: "wrong-password", newPassword: "new-password-1" })
    ).rejects.toThrow(AuthError);

    expect(supabase.auth.updateUser).not.toHaveBeenCalled();
  });

  it("throws AuthError when there is no authenticated user", async () => {
    const supabase = makeSupabaseMock();
    supabase.auth.getUser.mockResolvedValue({ data: { user: null }, error: null });

    await expect(
      changePassword(supabase, { currentPassword: "old-password-1", newPassword: "new-password-1" })
    ).rejects.toThrow(AuthError);

    expect(supabase.auth.signInWithPassword).not.toHaveBeenCalled();
  });

  it("throws AuthError when the final updateUser call fails", async () => {
    const supabase = makeSupabaseMock();
    supabase.auth.getUser.mockResolvedValue({ data: { user: { email: "ada@example.com" } }, error: null });
    supabase.auth.signInWithPassword.mockResolvedValue({ data: { user: { id: "user-1" } }, error: null });
    supabase.auth.updateUser.mockResolvedValue({ error: { message: "Password too weak" } });

    await expect(
      changePassword(supabase, { currentPassword: "old-password-1", newPassword: "new-password-1" })
    ).rejects.toThrow(AuthError);
  });
});
