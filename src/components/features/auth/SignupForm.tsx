"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useState, useTransition } from "react";
import { signupSchema, type SignupInput } from "@/lib/validation/authSchemas";
import { signupAction } from "@/app/(auth)/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PasswordStrengthMeter } from "@/components/features/auth/PasswordStrengthMeter";
import { ResendVerificationButton } from "@/components/features/auth/ResendVerificationButton";
import { useTranslation } from "@/lib/i18n/useTranslation";

export function SignupForm() {
  const { t } = useTranslation();
  const signup = t.auth.signup;
  const [isPending, startTransition] = useTransition();
  const [serverError, setServerError] = useState<string>();
  const [submittedEmail, setSubmittedEmail] = useState<string>();
  const [passwordFocused, setPasswordFocused] = useState(false);
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<SignupInput>({ resolver: zodResolver(signupSchema), mode: "onChange" });

  const password = watch("password") ?? "";

  const onSubmit = (data: SignupInput) => {
    setServerError(undefined);
    const formData = new FormData();
    Object.entries(data).forEach(([key, value]) => formData.append(key, value));
    startTransition(async () => {
      const result = await signupAction(formData);
      if (result.error) setServerError(result.error);
      else setSubmittedEmail(data.email);
    });
  };

  if (submittedEmail) {
    return (
      <div className="space-y-4">
        <p role="status">{signup.checkEmail}</p>
        <ResendVerificationButton email={submittedEmail} />
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div>
        <Label htmlFor="firstName">{signup.firstName}</Label>
        <Input id="firstName" placeholder={signup.firstNamePlaceholder} {...register("firstName")} />
        {errors.firstName && <p className="text-sm text-destructive">{errors.firstName.message}</p>}
      </div>
      <div>
        <Label htmlFor="lastName">{signup.lastName}</Label>
        <Input id="lastName" placeholder={signup.lastNamePlaceholder} {...register("lastName")} />
        {errors.lastName && <p className="text-sm text-destructive">{errors.lastName.message}</p>}
      </div>
      <div>
        <Label htmlFor="email">{signup.email}</Label>
        <Input id="email" type="email" placeholder={signup.emailPlaceholder} {...register("email")} />
        {errors.email && <p className="text-sm text-destructive">{errors.email.message}</p>}
      </div>
      <div>
        <Label htmlFor="password">{signup.password}</Label>
        <Input
          id="password"
          type="password"
          placeholder={signup.passwordPlaceholder}
          {...register("password", {
            onBlur: () => setPasswordFocused(false),
          })}
          onFocus={() => setPasswordFocused(true)}
        />
        <PasswordStrengthMeter password={password} show={passwordFocused || password.length > 0} />
        {errors.password && <p className="mt-1.5 text-sm text-destructive">{errors.password.message}</p>}
      </div>
      <div>
        <Label htmlFor="confirmPassword">{signup.confirmPassword}</Label>
        <Input
          id="confirmPassword"
          type="password"
          placeholder={signup.confirmPasswordPlaceholder}
          {...register("confirmPassword")}
        />
        {errors.confirmPassword && <p className="text-sm text-destructive">{errors.confirmPassword.message}</p>}
      </div>
      {serverError && <p className="text-sm text-destructive">{serverError}</p>}
      <Button type="submit" disabled={isPending} className="w-full">
        {isPending ? signup.submitting : signup.submit}
      </Button>
    </form>
  );
}
