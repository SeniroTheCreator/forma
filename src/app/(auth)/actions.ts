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
import { mapErrorToResponse, ForbiddenError } from "@/lib/errors/AppError";
import { logger } from "@/lib/logger";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";

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
    const { userId } = await authService.login(supabase, parsed.data);

    // Credentials were correct, but a suspended account must not end up with a live
    // session. Checked here as well as in src/proxy.ts because these are two different
    // moments: this blocks the session from ever being created, the proxy kills a session
    // that was already live when the account got suspended.
    const { data: profile } = await supabase.from("users").select("account_status").eq("id", userId).single();
    if (profile?.account_status === "suspended") {
      await authService.logout(supabase);
      throw new ForbiddenError(authService.SUSPENDED_ACCOUNT_MESSAGE);
    }

    // last_login_at is a system-set field: 0007_users_avatar_url_and_column_grants.sql
    // deliberately withholds it from `authenticated`'s column-scoped UPDATE grant so a
    // user can't forge their own login history, so this write goes through the
    // service-role client. Scoped by the id login() just returned rather than by email
    // (which is not a unique column in public.users and is user-supplied input here).
    const adminSupabase = createAdminSupabaseClient();
    await adminSupabase.from("users").update({ last_login_at: new Date().toISOString() }).eq("id", userId);

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
  // Same {email} shape as forgotPasswordSchema, so it reuses it rather than declaring a
  // duplicate schema — every sibling action validates with zod before touching a service.
  const parsed = forgotPasswordSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input" };

  try {
    await enforceRateLimit(`resend-verification:${await clientIp()}`);
    const supabase = await createServerSupabaseClient();
    await authService.resendVerificationEmail(supabase, parsed.data.email);
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
