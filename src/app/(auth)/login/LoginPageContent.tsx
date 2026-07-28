"use client";

import { LoginForm } from "@/components/features/auth/LoginForm";
import { BackLink } from "@/components/features/auth/BackLink";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useTranslation } from "@/lib/i18n/useTranslation";

export function LoginPageContent({ suspended }: { suspended: boolean }) {
  const { t } = useTranslation();

  return (
    <div>
      <BackLink href="/" label={t.auth.backToHome} />
      <Card>
        <CardHeader>
          <CardTitle>{t.auth.login.title}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {suspended && (
            <p role="alert" className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {t.auth.login.suspended}
            </p>
          )}
          <LoginForm />
        </CardContent>
      </Card>
    </div>
  );
}
