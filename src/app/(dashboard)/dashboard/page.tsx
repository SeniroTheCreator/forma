import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import * as userService from "@/lib/services/userService";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default async function DashboardPage() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const profile = await userService.getProfile(supabase, user.id, user.id);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">
          Welcome back, {profile.first_name}
        </h1>
        <p className="text-sm text-muted-foreground">Here&apos;s an overview of your account.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Your profile</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <dt className="text-xs font-medium uppercase text-muted-foreground">Name</dt>
              <dd className="text-sm text-zinc-900">
                {profile.first_name} {profile.last_name}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-medium uppercase text-muted-foreground">Email</dt>
              <dd className="text-sm text-zinc-900">{profile.email}</dd>
            </div>
            <div>
              <dt className="text-xs font-medium uppercase text-muted-foreground">Account status</dt>
              <dd className="text-sm text-zinc-900">{profile.account_status}</dd>
            </div>
            <div>
              <dt className="text-xs font-medium uppercase text-muted-foreground">Last login</dt>
              <dd className="text-sm text-zinc-900">
                {profile.last_login_at ? new Date(profile.last_login_at).toLocaleString() : "—"}
              </dd>
            </div>
          </dl>
        </CardContent>
      </Card>
    </div>
  );
}
