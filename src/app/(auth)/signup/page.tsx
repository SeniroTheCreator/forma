"use client";

import { SignupForm } from "@/components/features/auth/SignupForm";
import { BackLink } from "@/components/features/auth/BackLink";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useTranslation } from "@/lib/i18n/useTranslation";

export default function SignupPage() {
  const { t } = useTranslation();

  return (
    <div>
      <BackLink href="/" label={t.auth.backToHome} />
      <Card>
        <CardHeader>
          <CardTitle>{t.auth.signup.title}</CardTitle>
        </CardHeader>
        <CardContent>
          <SignupForm />
        </CardContent>
      </Card>
    </div>
  );
}
