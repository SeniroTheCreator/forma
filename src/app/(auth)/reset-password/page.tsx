import { ResetPasswordForm } from "@/components/features/auth/ResetPasswordForm";
import { BackLink } from "@/components/features/auth/BackLink";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function ResetPasswordPage() {
  return (
    <div>
      <BackLink href="/login" label="Back to log in" />
      <Card>
        <CardHeader>
          <CardTitle>Reset password</CardTitle>
        </CardHeader>
        <CardContent>
          <ResetPasswordForm />
        </CardContent>
      </Card>
    </div>
  );
}
