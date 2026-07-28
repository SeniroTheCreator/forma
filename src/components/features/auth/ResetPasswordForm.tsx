"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { resetPasswordSchema, type ResetPasswordInput } from "@/lib/validation/authSchemas";
import { resetPasswordAction } from "@/app/(auth)/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PasswordStrengthMeter } from "@/components/features/auth/PasswordStrengthMeter";
import { useTranslation } from "@/lib/i18n/useTranslation";

export function ResetPasswordForm() {
  const { t } = useTranslation();
  const resetPassword = t.auth.resetPassword;
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [serverError, setServerError] = useState<string>();
  const [passwordFocused, setPasswordFocused] = useState(false);
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<ResetPasswordInput>({ resolver: zodResolver(resetPasswordSchema), mode: "onChange" });

  const password = watch("password") ?? "";

  const onSubmit = (data: ResetPasswordInput) => {
    setServerError(undefined);
    const formData = new FormData();
    Object.entries(data).forEach(([key, value]) => formData.append(key, value));
    startTransition(async () => {
      const result = await resetPasswordAction(formData);
      if (result.error) setServerError(result.error);
      else router.push("/login");
    });
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div>
        <Label htmlFor="password">{resetPassword.newPassword}</Label>
        <Input
          id="password"
          type="password"
          placeholder={resetPassword.passwordPlaceholder}
          {...register("password", { onBlur: () => setPasswordFocused(false) })}
          onFocus={() => setPasswordFocused(true)}
        />
        <PasswordStrengthMeter password={password} show={passwordFocused || password.length > 0} />
        {errors.password && <p className="mt-1.5 text-sm text-destructive">{errors.password.message}</p>}
      </div>
      <div>
        <Label htmlFor="confirmPassword">{resetPassword.confirmPassword}</Label>
        <Input
          id="confirmPassword"
          type="password"
          placeholder={resetPassword.confirmPasswordPlaceholder}
          {...register("confirmPassword")}
        />
        {errors.confirmPassword && <p className="text-sm text-destructive">{errors.confirmPassword.message}</p>}
      </div>
      {serverError && <p className="text-sm text-destructive">{serverError}</p>}
      <Button type="submit" disabled={isPending} className="w-full">
        {isPending ? resetPassword.submitting : resetPassword.submit}
      </Button>
    </form>
  );
}
