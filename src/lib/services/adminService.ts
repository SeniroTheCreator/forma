import type { SupabaseClient } from "@supabase/supabase-js";
import { requirePermission } from "@/lib/permissions";
import { insertAuditLog } from "@/lib/db/auditLog";
import { notifyUser } from "@/lib/services/notificationService";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";

export async function listUsers(
  supabase: SupabaseClient,
  callerId: string,
  options: { search?: string; page: number; pageSize?: number }
) {
  await requirePermission(supabase, callerId, "users:read");
  const pageSize = options.pageSize ?? 20;
  const from = (options.page - 1) * pageSize;
  const to = from + pageSize - 1;

  let query = supabase.from("users").select("*", { count: "exact" }).range(from, to);
  if (options.search) {
    query = query.or(`email.ilike.%${options.search}%,first_name.ilike.%${options.search}%,last_name.ilike.%${options.search}%`);
  }

  const { data, count, error } = await query;
  if (error) throw error;
  return { users: data ?? [], total: count ?? 0 };
}

export async function getUserById(supabase: SupabaseClient, callerId: string, targetId: string) {
  await requirePermission(supabase, callerId, "users:read");

  const { data: user, error: userError } = await supabase.from("users").select("*").eq("id", targetId).single();
  if (userError) throw userError;

  const { data: userRole, error: roleError } = await supabase
    .from("user_roles")
    .select("roles(name)")
    .eq("user_id", targetId)
    .single();
  if (roleError) throw roleError;

  const role = (userRole as unknown as { roles: { name: string } | null } | null)?.roles?.name ?? null;
  return { ...user, role };
}

/**
 * Reassigns a target user's role.
 *
 * The permission check and the users/user_roles mutations run against the CALLER's own
 * (RLS-scoped) `supabase` client — this is what makes the action genuinely gated by
 * `requirePermission`/RLS's `has_permission(auth.uid(), 'users:write')` rather than by an
 * application-level check alone. Only the audit_log/notification writes afterwards switch
 * to a service-role client, because `authenticated` has no INSERT grant on those two
 * tables (by design — see 0002_files_notifications_audit.sql) and those writes must only
 * ever happen server-side. Never use the admin client for the permission check or the
 * mutation itself: doing so would bypass RLS and let any caller reach this code path.
 */
export async function changeUserRole(supabase: SupabaseClient, callerId: string, targetId: string, roleName: string): Promise<void> {
  await requirePermission(supabase, callerId, "users:write");

  const { data: role, error: roleError } = await supabase.from("roles").select("id").eq("name", roleName).single();
  if (roleError || !role) throw roleError ?? new Error("Unknown role");

  await supabase.from("user_roles").delete().eq("user_id", targetId);
  const { error } = await supabase.from("user_roles").insert({ user_id: targetId, role_id: role.id });
  if (error) throw error;

  const adminSupabase = createAdminSupabaseClient();
  await insertAuditLog(adminSupabase, {
    actor_id: callerId,
    action: "user.role_changed",
    target_type: "user",
    target_id: targetId,
    metadata: { newRole: roleName },
  });
  await notifyUser(adminSupabase, targetId, {
    type: "account_role",
    title: "Your role was updated",
    message: `Your account role was changed to ${roleName}.`,
  });
}

/**
 * Suspends or reactivates a target user's account.
 *
 * Same client split as `changeUserRole`: the permission check and the `users` table
 * mutation run against the caller's own client (RLS + the `protect_account_status`
 * trigger genuinely gate this), and only the audit_log/notification writes use the
 * service-role admin client.
 */
export async function setAccountStatus(
  supabase: SupabaseClient,
  callerId: string,
  targetId: string,
  status: "active" | "suspended"
): Promise<void> {
  await requirePermission(supabase, callerId, "users:suspend");

  const { error } = await supabase.from("users").update({ account_status: status }).eq("id", targetId);
  if (error) throw error;

  const adminSupabase = createAdminSupabaseClient();
  await insertAuditLog(adminSupabase, {
    actor_id: callerId,
    action: "user.status_changed",
    target_type: "user",
    target_id: targetId,
    metadata: { newStatus: status },
  });
  await notifyUser(adminSupabase, targetId, {
    type: "account_status",
    title: status === "suspended" ? "Your account was suspended" : "Your account was reactivated",
    message: status === "suspended" ? "Contact support if you believe this is a mistake." : "Welcome back!",
  });
}
