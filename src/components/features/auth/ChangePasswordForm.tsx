"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useState, useTransition } from "react";
import { useDispatch } from "react-redux";
import { changePasswordSchema, type ChangePasswordInput } from "@/lib/validation/authSchemas";
import { changePasswordAction } from "@/app/(auth)/actions";
import { showToast } from "@/store/slices/uiSlice";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PasswordStrengthMeter } from "@/components/features/auth/PasswordStrengthMeter";

export function ChangePasswordForm() {
  const dispatch = useDispatch();
  const [isPending, startTransition] = useTransition();
  const [serverError, setServerError] = useState<string>();
  const [passwordFocused, setPasswordFocused] = useState(false);
  const {
    register,
    handleSubmit,
    watch,
    reset,
    formState: { errors },
  } = useForm<ChangePasswordInput>({ resolver: zodResolver(changePasswordSchema), mode: "onChange" });

  const newPassword = watch("newPassword") ?? "";

  const onSubmit = (data: ChangePasswordInput) => {
    setServerError(undefined);
    const formData = new FormData();
    Object.entries(data).forEach(([key, value]) => formData.append(key, value));
    startTransition(async () => {
      const result = await changePasswordAction(formData);
      if (result.error) {
        setServerError(result.error);
        dispatch(showToast({ message: result.error, variant: "error" }));
      } else {
        reset();
        dispatch(showToast({ message: "Password changed successfully", variant: "success" }));
      }
    });
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div>
        <Label htmlFor="currentPassword">Current password</Label>
        <Input id="currentPassword" type="password" placeholder="Your current password" {...register("currentPassword")} />
        {errors.currentPassword && (
          <p className="text-sm text-destructive">{errors.currentPassword.message}</p>
        )}
      </div>
      <div>
        <Label htmlFor="newPassword">New password</Label>
        <Input
          id="newPassword"
          type="password"
          placeholder="At least 8 characters"
          {...register("newPassword", { onBlur: () => setPasswordFocused(false) })}
          onFocus={() => setPasswordFocused(true)}
        />
        <PasswordStrengthMeter password={newPassword} show={passwordFocused || newPassword.length > 0} />
        {errors.newPassword && <p className="mt-1.5 text-sm text-destructive">{errors.newPassword.message}</p>}
      </div>
      {serverError && <p className="text-sm text-destructive">{serverError}</p>}
      <Button type="submit" disabled={isPending}>
        {isPending ? "Changing..." : "Change password"}
      </Button>
    </form>
  );
}
