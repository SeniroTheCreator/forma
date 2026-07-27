"use client";

import { useState, useTransition } from "react";
import { resendVerificationAction } from "@/app/(auth)/actions";
import { Button } from "@/components/ui/button";

export function ResendVerificationButton({ email }: { email: string }) {
  const [isPending, startTransition] = useTransition();
  const [sent, setSent] = useState(false);

  return (
    <Button
      variant="outline"
      disabled={isPending || sent}
      onClick={() => {
        const formData = new FormData();
        formData.append("email", email);
        startTransition(async () => {
          await resendVerificationAction(formData);
          setSent(true);
        });
      }}
    >
      {sent ? "Verification email sent" : "Resend verification email"}
    </Button>
  );
}
