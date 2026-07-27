import { UserDetailPanel } from "@/components/features/admin/UserDetailPanel";

export default async function AdminUserDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">User detail</h1>
        <p className="text-sm text-muted-foreground">Review and manage this user&apos;s role and account status.</p>
      </div>
      <UserDetailPanel userId={id} />
    </div>
  );
}
