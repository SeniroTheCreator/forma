"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useState, useTransition } from "react";
import { useDispatch } from "react-redux";
import { updateProfileAction } from "@/app/(dashboard)/actions";
import { profileSchema, type ProfileInput } from "@/lib/validation/userSchemas";
import { showToast } from "@/store/slices/uiSlice";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function ProfileForm({ firstName, lastName }: { firstName: string; lastName: string }) {
  const dispatch = useDispatch();
  const [isPending, startTransition] = useTransition();
  const [serverError, setServerError] = useState<string>();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ProfileInput>({
    resolver: zodResolver(profileSchema),
    defaultValues: { firstName, lastName },
  });

  const onSubmit = (data: ProfileInput) => {
    setServerError(undefined);
    const formData = new FormData();
    Object.entries(data).forEach(([key, value]) => formData.append(key, value));
    startTransition(async () => {
      const result = await updateProfileAction(formData);
      if (result.error) {
        setServerError(result.error);
        dispatch(showToast({ message: result.error, variant: "error" }));
      } else {
        dispatch(showToast({ message: "Profile updated successfully", variant: "success" }));
      }
    });
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div>
        <Label htmlFor="firstName">First name</Label>
        <Input id="firstName" {...register("firstName")} />
        {errors.firstName && <p className="text-sm text-red-600">{errors.firstName.message}</p>}
      </div>
      <div>
        <Label htmlFor="lastName">Last name</Label>
        <Input id="lastName" {...register("lastName")} />
        {errors.lastName && <p className="text-sm text-red-600">{errors.lastName.message}</p>}
      </div>
      {serverError && <p className="text-sm text-red-600">{serverError}</p>}
      <Button type="submit" disabled={isPending}>
        {isPending ? "Saving..." : "Save changes"}
      </Button>
    </form>
  );
}
