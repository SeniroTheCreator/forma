"use client";

import { ResetPasswordForm } from "@/components/features/auth/ResetPasswordForm";
import { BackLink } from "@/components/features/auth/BackLink";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useTranslation } from "@/lib/i18n/useTranslation";

export default function ResetPasswordPage() {
  const { t } = useTranslation();

  return (
    <div>
      <BackLink href="/login" label={t.auth.backToLogin} />
      <Card>
        <CardHeader>
          <CardTitle>{t.auth.resetPassword.title}</CardTitle>
        </CardHeader>
        <CardContent>
          <ResetPasswordForm />
        </CardContent>
      </Card>
    </div>
  );
}
