"use client";

import { ResendVerificationButton } from "@/components/features/auth/ResendVerificationButton";
import { BackLink } from "@/components/features/auth/BackLink";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useTranslation } from "@/lib/i18n/useTranslation";

export function VerifyEmailContent({ email }: { email?: string }) {
  const { t } = useTranslation();
  const verifyEmail = t.auth.verifyEmail;

  return (
    <div>
      <BackLink href="/login" label={t.auth.backToLogin} />
      <Card>
        <CardHeader>
          <CardTitle>{verifyEmail.title}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p>
            {verifyEmail.sentTo} {email ? <strong>{email}</strong> : verifyEmail.yourEmailAddress}. {verifyEmail.clickLink}
          </p>
          {email && <ResendVerificationButton email={email} />}
        </CardContent>
      </Card>
    </div>
  );
}
