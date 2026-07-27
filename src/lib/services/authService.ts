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
