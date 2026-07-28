"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useState, useTransition } from "react";
import { forgotPasswordSchema, type ForgotPasswordInput } from "@/lib/validation/authSchemas";
import { forgotPasswordAction } from "@/app/(auth)/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useTranslation } from "@/lib/i18n/useTranslation";

export function ForgotPasswordForm() {
  const { t } = useTranslation();
  const forgotPassword = t.auth.forgotPassword;
  const [isPending, startTransition] = useTransition();
  const [serverError, setServerError] = useState<string>();
  const [submitted, setSubmitted] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ForgotPasswordInput>({ resolver: zodResolver(forgotPasswordSchema), mode: "onChange" });

  const onSubmit = (data: ForgotPasswordInput) => {
    setServerError(undefined);
    const formData = new FormData();
    Object.entries(data).forEach(([key, value]) => formData.append(key, value));
    startTransition(async () => {
      const result = await forgotPasswordAction(formData);
      if (result.error) setServerError(result.error);
      else setSubmitted(true);
    });
  };

  if (submitted) {
    return <p role="status">{forgotPassword.checkEmail}</p>;
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div>
        <Label htmlFor="email">{forgotPassword.email}</Label>
        <Input id="email" type="email" placeholder={forgotPassword.emailPlaceholder} {...register("email")} />
        {errors.email && <p className="text-sm text-destructive">{errors.email.message}</p>}
      </div>
      {serverError && <p className="text-sm text-destructive">{serverError}</p>}
      <Button type="submit" disabled={isPending} className="w-full">
        {isPending ? forgotPassword.submitting : forgotPassword.submit}
      </Button>
    </form>
  );
}
