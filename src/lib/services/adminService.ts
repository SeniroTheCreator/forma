import type { SupabaseClient } from "@supabase/supabase-js";
import { requirePermission } from "@/lib/permissions";
import { insertAuditLog } from "@/lib/db/auditLog";
import { notifyUser } from "@/lib/services/notificationService";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { ForbiddenError } from "@/lib/errors/AppError";

/**
 * There is no bootstrap/re-promotion flow in this application: the only way an account
 * gets the `admin` role is `supabase/seed.sql` or an existing admin granting it. So an
 * admin who demotes or suspends themselves is unrecoverable without direct database
 * access — and with a single admin account (the seeded default) that locks the whole
 * admin panel permanently. Both mutating admin operations refuse to target the caller.
 */
function rejectSelfTargeting(callerId: string, targetId: string): void {
  if (callerId === targetId) {
    throw new ForbiddenError("You cannot modify your own account from the admin panel");
  }
}

/**
 * PostgREST's filter DSL treats `,` as the separator between the conditions inside
 * `or=(...)`, and `(`/`)` as its grouping delimiters — so interpolating a raw search term
 * into `.or(...)` lets the term restructure the filter it was supposed to be a value in.
 * PostgREST's own escape hatch for values containing reserved characters is to wrap the
 * value in double quotes, with `"` and `\` backslash-escaped inside; the term is then
 * parsed as a single literal no matter what it contains.
 *
 * The route handler additionally rejects the structural characters up front via zod
 * (`listUsersQuerySchema`), but this escaping is what makes the service itself safe for
 * any caller rather than relying on validation happening somewhere upstream.
 */
function toPostgrestLiteral(value: string): string {
  return `"${value.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
}

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
    const term = toPostgrestLiteral(`%${options.search}%`);
    query = query.or(`email.ilike.${term},first_name.ilike.${term},last_name.ilike.${term}`);
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
  rejectSelfTargeting(callerId, targetId);

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
 * mutation run against the caller's own client, and only the audit_log/notification
 * writes use the service-role admin client.
 *
 * Independent defense-in-depth: the `protect_account_status` trigger (see
 * 0005_fix_account_status_permission.sql) separately re-checks
 * `has_permission(auth.uid(), 'users:suspend')` at the DB level and silently reverts any
 * `account_status` change that lacks it — this matches the `users:suspend` permission
 * this function requires above, so a caller who only has `users:write` (e.g. a role that
 * can edit other users' profiles but is not permitted to suspend/reactivate them) cannot
 * flip `account_status` via a direct Data API call even though they could update other
 * fields on the same row.
 */
export async function setAccountStatus(
  supabase: SupabaseClient,
  callerId: string,
  targetId: string,
  status: "active" | "suspended"
): Promise<void> {
  await requirePermission(supabase, callerId, "users:suspend");
  rejectSelfTargeting(callerId, targetId);

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
