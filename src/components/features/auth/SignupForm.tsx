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

export function SignupForm() {
  const [isPending, startTransition] = useTransition();
  const [serverError, setServerError] = useState<string>();
  const [submitted, setSubmitted] = useState(false);
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
      else setSubmitted(true);
    });
  };

  if (submitted) {
    return <p role="status">Check your email to verify your account.</p>;
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div>
        <Label htmlFor="firstName">First name</Label>
        <Input id="firstName" placeholder="e.g. John" {...register("firstName")} />
        {errors.firstName && <p className="text-sm text-destructive">{errors.firstName.message}</p>}
      </div>
      <div>
        <Label htmlFor="lastName">Last name</Label>
        <Input id="lastName" placeholder="e.g. Smith" {...register("lastName")} />
        {errors.lastName && <p className="text-sm text-destructive">{errors.lastName.message}</p>}
      </div>
      <div>
        <Label htmlFor="email">Email</Label>
        <Input id="email" type="email" placeholder="you@example.com" {...register("email")} />
        {errors.email && <p className="text-sm text-destructive">{errors.email.message}</p>}
      </div>
      <div>
        <Label htmlFor="password">Password</Label>
        <Input
          id="password"
          type="password"
          placeholder="At least 8 characters"
          {...register("password", {
            onBlur: () => setPasswordFocused(false),
          })}
          onFocus={() => setPasswordFocused(true)}
        />
        <PasswordStrengthMeter password={password} show={passwordFocused || password.length > 0} />
        {errors.password && <p className="mt-1.5 text-sm text-destructive">{errors.password.message}</p>}
      </div>
      <div>
        <Label htmlFor="confirmPassword">Confirm password</Label>
        <Input id="confirmPassword" type="password" placeholder="Type your password again" {...register("confirmPassword")} />
        {errors.confirmPassword && <p className="text-sm text-destructive">{errors.confirmPassword.message}</p>}
      </div>
      {serverError && <p className="text-sm text-destructive">{serverError}</p>}
      <Button type="submit" disabled={isPending} className="w-full">
        {isPending ? "Creating account..." : "Sign up"}
      </Button>
    </form>
  );
}
