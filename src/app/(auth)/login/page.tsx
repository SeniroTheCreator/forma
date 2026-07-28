import { LoginPageContent } from "./LoginPageContent";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ suspended?: string }>;
}) {
  // src/proxy.ts redirects a live session here with ?suspended=1 the moment the account's
  // status flips, so the user gets an explanation instead of a silent bounce to login.
  const { suspended } = await searchParams;

  return <LoginPageContent suspended={suspended === "1"} />;
}
