import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import * as userService from "@/lib/services/userService";
import { ProfileForm } from "@/components/features/dashboard/ProfileForm";
import { ChangePasswordForm } from "@/components/features/auth/ChangePasswordForm";
import { AvatarUpload } from "@/components/features/settings/AvatarUpload";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default async function SettingsPage() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const profile = await userService.getProfile(supabase, user.id, user.id);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">Settings</h1>
        <p className="text-sm text-muted-foreground">Manage your profile and account security.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Avatar</CardTitle>
        </CardHeader>
        <CardContent>
          <AvatarUpload initialAvatarUrl={profile.avatar_url} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Profile</CardTitle>
        </CardHeader>
        <CardContent>
          <ProfileForm firstName={profile.first_name} lastName={profile.last_name} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Change password</CardTitle>
        </CardHeader>
        <CardContent>
          <ChangePasswordForm />
        </CardContent>
      </Card>
    </div>
  );
}
