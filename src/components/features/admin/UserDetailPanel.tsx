"use client";

import { useState, type FormEvent } from "react";
import { useDispatch } from "react-redux";
import { useRouter } from "next/navigation";
import { useGetUserQuery, useChangeRoleMutation, useSetStatusMutation } from "@/store/api/adminApi";
import { showToast } from "@/store/slices/uiSlice";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

// Only 'user' and 'admin' are seeded (0001_core_schema.sql); there is no roles-listing
// endpoint yet, so this mirrors the seeded set directly.
const AVAILABLE_ROLES = ["user", "admin"];

export function UserDetailPanel({ userId }: { userId: string }) {
  const dispatch = useDispatch();
  const router = useRouter();
  const { data: user, isLoading, error } = useGetUserQuery(userId);
  const [changeRole, { isLoading: isChangingRole }] = useChangeRoleMutation();
  const [setStatus, { isLoading: isChangingStatus }] = useSetStatusMutation();
  // Local override for the role dropdown while the user is editing it; falls back to the
  // server's authoritative value. Derived during render (no effect needed) — cleared once
  // a change succeeds so the dropdown resyncs with the refetched server value.
  const [roleOverride, setRoleOverride] = useState<string | null>(null);
  const selectedRole = roleOverride ?? user?.role ?? "";

  const handleRoleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!selectedRole || selectedRole === user?.role) return;
    try {
      await changeRole({ id: userId, role: selectedRole }).unwrap();
      setRoleOverride(null);
      dispatch(showToast({ message: "Role updated successfully", variant: "success" }));
    } catch {
      dispatch(showToast({ message: "Failed to update role", variant: "error" }));
    }
  };

  const handleToggleStatus = async () => {
    if (!user) return;
    const nextStatus = user.account_status === "suspended" ? "active" : "suspended";
    try {
      await setStatus({ id: userId, status: nextStatus }).unwrap();
      dispatch(
        showToast({
          message: nextStatus === "suspended" ? "User suspended" : "User reactivated",
          variant: "success",
        })
      );
    } catch {
      dispatch(showToast({ message: "Failed to update account status", variant: "error" }));
    }
  };

  if (isLoading) return <p className="py-6 text-center text-sm text-muted-foreground">Loading user...</p>;
  if (error || !user) return <p className="py-6 text-center text-sm text-red-600">Failed to load user.</p>;

  return (
    <div className="space-y-6">
      <Button type="button" variant="outline" size="sm" onClick={() => router.push("/admin/users")}>
        Back to users
      </Button>

      <Card>
        <CardHeader>
          <CardTitle>
            {user.first_name} {user.last_name}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-1 text-sm text-zinc-600">
          <p>{user.email}</p>
          <p>
            Status:{" "}
            <span
              className={cn(
                "font-medium",
                user.account_status === "suspended" ? "text-red-600" : "text-green-700"
              )}
            >
              {user.account_status}
            </span>
          </p>
          <p>Joined {new Date(user.created_at).toLocaleDateString()}</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Role</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleRoleSubmit} className="flex items-center gap-2">
            <select
              value={selectedRole}
              onChange={(e) => setRoleOverride(e.target.value)}
              aria-label="Role"
              className="h-8 rounded-lg border border-input bg-transparent px-2.5 text-sm"
            >
              {AVAILABLE_ROLES.map((role) => (
                <option key={role} value={role}>
                  {role}
                </option>
              ))}
            </select>
            <Button type="submit" disabled={isChangingRole || selectedRole === user.role}>
              {isChangingRole ? "Saving..." : "Save role"}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Account status</CardTitle>
        </CardHeader>
        <CardContent>
          <Button
            type="button"
            variant={user.account_status === "suspended" ? "default" : "destructive"}
            disabled={isChangingStatus}
            onClick={handleToggleStatus}
          >
            {isChangingStatus
              ? "Saving..."
              : user.account_status === "suspended"
                ? "Reactivate account"
                : "Suspend account"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
