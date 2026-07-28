"use client";

import { useEffect, useState, useTransition } from "react";
import { resendVerificationAction } from "@/app/(auth)/actions";
import { Button } from "@/components/ui/button";
import { useTranslation } from "@/lib/i18n/useTranslation";

const COOLDOWN_SECONDS = 60;

export function ResendVerificationButton({
  email,
  startOnCooldown = true,
}: {
  email: string;
  /** A verification email was just sent when this button first appears, so it defaults to
   * starting on cooldown rather than letting it be clicked again immediately. */
  startOnCooldown?: boolean;
}) {
  const { t } = useTranslation();
  const [isPending, startTransition] = useTransition();
  const [secondsLeft, setSecondsLeft] = useState(startOnCooldown ? COOLDOWN_SECONDS : 0);

  useEffect(() => {
    if (secondsLeft <= 0) return;
    const timer = setInterval(() => setSecondsLeft((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(timer);
  }, [secondsLeft]);

  function handleClick() {
    const formData = new FormData();
    formData.append("email", email);
    startTransition(async () => {
      await resendVerificationAction(formData);
      setSecondsLeft(COOLDOWN_SECONDS);
    });
  }

  const onCooldown = secondsLeft > 0;
  const timeLabel = `${Math.floor(secondsLeft / 60)}:${(secondsLeft % 60).toString().padStart(2, "0")}`;

  return (
    <Button variant="outline" disabled={isPending || onCooldown} onClick={handleClick}>
      {onCooldown ? `${t.auth.verifyEmail.resendIn} ${timeLabel}` : t.auth.verifyEmail.resend}
    </Button>
  );
}
