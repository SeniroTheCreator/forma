import { ResendVerificationButton } from "@/components/features/auth/ResendVerificationButton";
import { BackLink } from "@/components/features/auth/BackLink";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default async function VerifyEmailPage({
  searchParams,
}: {
  searchParams: Promise<{ email?: string }>;
}) {
  const { email } = await searchParams;

  return (
    <div>
      <BackLink href="/login" label="Back to log in" />
      <Card>
        <CardHeader>
          <CardTitle>Verify your email</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p>
            We sent a verification link to {email ? <strong>{email}</strong> : "your email address"}. Click
            the link to activate your account.
          </p>
          {email && <ResendVerificationButton email={email} />}
        </CardContent>
      </Card>
    </div>
  );
}
