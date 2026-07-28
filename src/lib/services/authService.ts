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

/**
 * Shown (and returned by `loginAction`) when a suspended account's otherwise-correct
 * credentials are rejected, and by the `/login?suspended=1` banner a suspended live
 * session is redirected to from `src/proxy.ts`. Exported from here rather than from the
 * `"use server"` actions module, which may only export async functions.
 */
export const SUSPENDED_ACCOUNT_MESSAGE =
  "Your account has been suspended. Contact support if you believe this is a mistake.";

/**
 * Supabase's client library doesn't always surface a clean, safe-to-display string in
 * `error.message` — a failure on the auth server's own side (verified live: its SMTP relay
 * rejecting a send comes back as a 500 with `{"msg":"Error sending confirmation email",...}`,
 * which supabase-js turned into an `error.message` of literally `"{}"`) can reach here as
 * empty, or as a stray fragment of the response body rather than a sentence. Showing that
 * verbatim leaks an internal detail without helping anyone, so every call site in this file
 * that turns a Supabase error into an AuthError runs the message through this guard first —
 * anything that isn't a normal non-empty sentence falls back to a plain, safe message.
 */
function safeMessage(message: string | undefined, fallback: string): string {
  const trimmed = message?.trim();
  return trimmed && !/^[{[]/.test(trimmed) ? trimmed : fallback;
}

export async function signup(supabase: SupabaseClient, input: SignupInput): Promise<{ userId: string }> {
  const { data, error } = await supabase.auth.signUp({
    email: input.email,
    password: input.password,
    options: { data: { first_name: input.firstName, last_name: input.lastName } },
  });
  if (error || !data.user) {
    // With email confirmations disabled (local/dev config), signUp() rejects a duplicate
    // email directly with this exact message instead of the fake-user response below.
    // Normalized to the same wording so the UI is consistent across environments.
    if (error?.message === "User already registered") {
      throw new AuthError("An account with this email already exists.");
    }
    throw new AuthError(safeMessage(error?.message, "Something went wrong creating your account. Please try again."));
  }
  // Supabase returns a fake user with an empty `identities` array (instead of an error)
  // when the email already belongs to a *confirmed* account, so that signUp() can't be used
  // to mass-enumerate which emails are registered. An unconfirmed existing email instead
  // returns a real user and quietly resends the confirmation email, which is desirable
  // behavior we don't want to block here.
  if (data.user.identities && data.user.identities.length === 0) {
    throw new AuthError("An account with this email already exists.");
  }
  // When email confirmation is disabled (local/dev), signUp() auto-confirms the address
  // and returns an active session immediately. Sign back out so a brand-new account never
  // gets silent dashboard access — the user must log in explicitly, matching the "check your
  // email to verify your account" messaging. This is a no-op in environments where email
  // confirmation is required, since no session exists yet in that case.
  await supabase.auth.signOut();
  return { userId: data.user.id };
}

export async function login(supabase: SupabaseClient, input: LoginInput): Promise<{ userId: string }> {
  const { data, error } = await supabase.auth.signInWithPassword({ email: input.email, password: input.password });
  if (error || !data.user) {
    throw new AuthError(safeMessage(error?.message, "Invalid email or password"));
  }
  return { userId: data.user.id };
}

export async function logout(supabase: SupabaseClient): Promise<void> {
  const { error } = await supabase.auth.signOut();
  if (error) throw new AuthError(safeMessage(error.message, "Failed to log out. Please try again."));
}

export async function resendVerificationEmail(supabase: SupabaseClient, email: string): Promise<void> {
  const { error } = await supabase.auth.resend({ type: "signup", email });
  if (error) throw new AuthError(safeMessage(error.message, "Failed to send the verification email. Please try again shortly."));
}

export async function forgotPassword(supabase: SupabaseClient, input: ForgotPasswordInput): Promise<void> {
  const { error } = await supabase.auth.resetPasswordForEmail(input.email, {
    redirectTo: `${env.NEXT_PUBLIC_SITE_URL}/reset-password`,
  });
  if (error) throw new AuthError(safeMessage(error.message, "Failed to send the password reset email. Please try again shortly."));
}

export async function resetPassword(supabase: SupabaseClient, input: ResetPasswordInput): Promise<void> {
  const { error } = await supabase.auth.updateUser({ password: input.password });
  if (error) throw new AuthError(safeMessage(error.message, "Failed to reset your password. Please try again."));
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
  if (error) throw new AuthError(safeMessage(error.message, "Failed to change your password. Please try again."));
}
