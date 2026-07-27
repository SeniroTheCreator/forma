import { LoginForm } from "@/components/features/auth/LoginForm";
import { BackLink } from "@/components/features/auth/BackLink";
import { SUSPENDED_ACCOUNT_MESSAGE } from "@/lib/services/authService";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ suspended?: string }>;
}) {
  // src/proxy.ts redirects a live session here with ?suspended=1 the moment the account's
  // status flips, so the user gets an explanation instead of a silent bounce to login.
  const { suspended } = await searchParams;

  return (
    <div>
      <BackLink href="/" label="Back to home" />
      <Card>
        <CardHeader>
          <CardTitle>Log in</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {suspended === "1" && (
            <p role="alert" className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {SUSPENDED_ACCOUNT_MESSAGE}
            </p>
          )}
          <LoginForm />
        </CardContent>
      </Card>
    </div>
  );
}
