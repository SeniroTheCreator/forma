import { UsersTable } from "@/components/features/admin/UsersTable";

export default function AdminUsersPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">Users</h1>
        <p className="text-sm text-muted-foreground">Search, review, and manage user accounts.</p>
      </div>
      <UsersTable />
    </div>
  );
}
