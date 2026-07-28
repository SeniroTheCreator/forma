import { VerifyEmailContent } from "./VerifyEmailContent";

export default async function VerifyEmailPage({
  searchParams,
}: {
  searchParams: Promise<{ email?: string }>;
}) {
  const { email } = await searchParams;

  return <VerifyEmailContent email={email} />;
}
