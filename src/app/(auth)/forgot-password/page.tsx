import { ForgotPasswordForm } from "@/components/features/auth/ForgotPasswordForm";
import { BackLink } from "@/components/features/auth/BackLink";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function ForgotPasswordPage() {
  return (
    <div>
      <BackLink href="/login" label="Back to log in" />
      <Card>
        <CardHeader>
          <CardTitle>Forgot password</CardTitle>
        </CardHeader>
        <CardContent>
          <ForgotPasswordForm />
        </CardContent>
      </Card>
    </div>
  );
}
