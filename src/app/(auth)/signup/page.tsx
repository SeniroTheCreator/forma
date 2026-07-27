import { SignupForm } from "@/components/features/auth/SignupForm";
import { BackLink } from "@/components/features/auth/BackLink";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function SignupPage() {
  return (
    <div>
      <BackLink href="/" label="Back to home" />
      <Card>
        <CardHeader>
          <CardTitle>Create an account</CardTitle>
        </CardHeader>
        <CardContent>
          <SignupForm />
        </CardContent>
      </Card>
    </div>
  );
}
