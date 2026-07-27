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
import { mapErrorToResponse } from "@/lib/errors/AppError";
import { logger } from "@/lib/logger";

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
    await authService.login(supabase, parsed.data);
    await supabase
      .from("users")
      .update({ last_login_at: new Date().toISOString() })
      .eq("email", parsed.data.email);
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
  const email = String(formData.get("email") ?? "");
  try {
    await enforceRateLimit(`resend-verification:${await clientIp()}`);
    const supabase = await createServerSupabaseClient();
    await authService.resendVerificationEmail(supabase, email);
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
