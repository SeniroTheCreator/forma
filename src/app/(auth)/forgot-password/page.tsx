"use client";

import { ForgotPasswordForm } from "@/components/features/auth/ForgotPasswordForm";
import { BackLink } from "@/components/features/auth/BackLink";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useTranslation } from "@/lib/i18n/useTranslation";

export default function ForgotPasswordPage() {
  const { t } = useTranslation();

  return (
    <div>
      <BackLink href="/login" label={t.auth.backToLogin} />
      <Card>
        <CardHeader>
          <CardTitle>{t.auth.forgotPassword.title}</CardTitle>
        </CardHeader>
        <CardContent>
          <ForgotPasswordForm />
        </CardContent>
      </Card>
    </div>
  );
}
