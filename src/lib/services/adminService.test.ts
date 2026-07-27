import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/permissions", () => ({ requirePermission: vi.fn().mockResolvedValue(undefined) }));
vi.mock("@/lib/db/auditLog", () => ({ insertAuditLog: vi.fn().mockResolvedValue(undefined) }));
vi.mock("@/lib/services/notificationService", () => ({ notifyUser: vi.fn().mockResolvedValue(undefined) }));
vi.mock("@/lib/supabase/admin", () => ({ createAdminSupabaseClient: vi.fn() }));

import { listUsers, changeUserRole, setAccountStatus, getUserById } from "./adminService";
import { requirePermission } from "@/lib/permissions";
import { insertAuditLog } from "@/lib/db/auditLog";
import { notifyUser } from "@/lib/services/notificationService";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { ForbiddenError } from "@/lib/errors/AppError";

// A distinct object identity from the caller's client — every assertion below relies on
// this NOT being reference-equal to the caller's `supabase` mock, so that a test would fail
// if the implementation ever passed the caller's own (RLS-scoped) client to insertAuditLog/
// notifyUser instead of the service-role admin client.
const adminSupabase = { __marker: "admin-client" } as any;

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(createAdminSupabaseClient).mockReturnValue(adminSupabase);
});

describe("adminService.listUsers", () => {
  it("requires users:read and returns paginated users using the caller's own client", async () => {
    const range = vi.fn().mockResolvedValue({ data: [{ id: "u1" }], count: 1, error: null });
    const select = vi.fn().mockReturnValue({ range });
    const from = vi.fn().mockReturnValue({ select });
    const supabase = { from } as any;

    const result = await listUsers(supabase, "admin-1", { page: 1 });

    expect(requirePermission).toHaveBeenCalledWith(supabase, "admin-1", "users:read");
    expect(from).toHaveBeenCalledWith("users");
    expect(range).toHaveBeenCalledWith(0, 19);
    expect(result).toEqual({ users: [{ id: "u1" }], total: 1 });
    expect(createAdminSupabaseClient).not.toHaveBeenCalled();
  });

  it("applies a search filter across email/first_name/last_name when provided", async () => {
    const or = vi.fn().mockResolvedValue({ data: [], count: 0, error: null });
    const range = vi.fn().mockReturnValue({ or });
    const select = vi.fn().mockReturnValue({ range });
    const from = vi.fn().mockReturnValue({ select });
    const supabase = { from } as any;

    await listUsers(supabase, "admin-1", { page: 2, search: "jane" });

    expect(range).toHaveBeenCalledWith(20, 39);
    expect(or).toHaveBeenCalledWith(expect.stringContaining("jane"));
  });

  it("escapes the search term as a quoted PostgREST literal so it cannot restructure the filter", async () => {
    const or = vi.fn().mockResolvedValue({ data: [], count: 0, error: null });
    const range = vi.fn().mockReturnValue({ or });
    const select = vi.fn().mockReturnValue({ range });
    const from = vi.fn().mockReturnValue({ select });
    const supabase = { from } as any;

    // `,` ends a condition and `)` closes the or() group in PostgREST's filter DSL —
    // interpolated raw, this term would append an attacker-chosen condition.
    await listUsers(supabase, "admin-1", { page: 1, search: 'x",account_status.eq.suspended)' });

    const filter = or.mock.calls[0][0] as string;
    // Every value is wrapped in double quotes, and the term's own quote/backslash chars
    // are escaped, so no condition boundary can be forged from inside a value.
    expect(filter).toBe(
      'email.ilike."%x\\",account_status.eq.suspended)%",' +
        'first_name.ilike."%x\\",account_status.eq.suspended)%",' +
        'last_name.ilike."%x\\",account_status.eq.suspended)%"'
    );
  });
});

describe("adminService.getUserById", () => {
  it("requires users:read and returns the user row plus their role name", async () => {
    const userSingle = vi.fn().mockResolvedValue({ data: { id: "u1", email: "a@b.com" }, error: null });
    const userEq = vi.fn().mockReturnValue({ single: userSingle });
    const userSelect = vi.fn().mockReturnValue({ eq: userEq });

    const roleSingle = vi.fn().mockResolvedValue({ data: { roles: { name: "admin" } }, error: null });
    const roleEq = vi.fn().mockReturnValue({ single: roleSingle });
    const roleSelect = vi.fn().mockReturnValue({ eq: roleEq });

    const from = vi.fn((table: string) => {
      if (table === "users") return { select: userSelect };
      if (table === "user_roles") return { select: roleSelect };
      throw new Error(`unexpected table ${table}`);
    });
    const supabase = { from } as any;

    const result = await getUserById(supabase, "admin-1", "u1");

    expect(requirePermission).toHaveBeenCalledWith(supabase, "admin-1", "users:read");
    expect(result).toEqual({ id: "u1", email: "a@b.com", role: "admin" });
    expect(createAdminSupabaseClient).not.toHaveBeenCalled();
  });
});

describe("adminService.changeUserRole", () => {
  it("requires users:write, swaps the role via the caller's own client, and logs/notifies via the service-role admin client", async () => {
    const rolesSingle = vi.fn().mockResolvedValue({ data: { id: "role-admin" }, error: null });
    const rolesEq = vi.fn().mockReturnValue({ single: rolesSingle });
    const rolesSelect = vi.fn().mockReturnValue({ eq: rolesEq });

    const deleteEq = vi.fn().mockResolvedValue({ error: null });
    const deleteFn = vi.fn().mockReturnValue({ eq: deleteEq });

    const insert = vi.fn().mockResolvedValue({ error: null });

    const from = vi.fn((table: string) => {
      if (table === "roles") return { select: rolesSelect };
      if (table === "user_roles") return { delete: deleteFn, insert };
      throw new Error(`unexpected table ${table}`);
    });
    const supabase = { from } as any;

    await changeUserRole(supabase, "admin-1", "u1", "admin");

    // The permission check and the actual table mutations must run against the CALLER's
    // own client — this is what keeps the mutation genuinely RLS/has_permission-gated.
    expect(requirePermission).toHaveBeenCalledWith(supabase, "admin-1", "users:write");
    expect(from).toHaveBeenCalledWith("roles");
    expect(from).toHaveBeenCalledWith("user_roles");
    expect(deleteEq).toHaveBeenCalledWith("user_id", "u1");
    expect(insert).toHaveBeenCalledWith({ user_id: "u1", role_id: "role-admin" });

    // The audit log + notification writes must use the service-role admin client, never
    // the caller's client (audit_log/notifications grant INSERT only to service_role).
    expect(insertAuditLog).toHaveBeenCalledWith(
      adminSupabase,
      expect.objectContaining({ actor_id: "admin-1", target_id: "u1", action: "user.role_changed", metadata: { newRole: "admin" } })
    );
    expect(notifyUser).toHaveBeenCalledWith(adminSupabase, "u1", expect.objectContaining({ type: "account_role" }));

    // Never call insertAuditLog/notifyUser with the caller's own (RLS-scoped) client.
    expect(insertAuditLog).not.toHaveBeenCalledWith(supabase, expect.anything());
    expect(notifyUser).not.toHaveBeenCalledWith(supabase, expect.anything(), expect.anything());
  });

  it("refuses to change the caller's own role (no bootstrap flow exists to undo a self-demotion)", async () => {
    const from = vi.fn();
    const supabase = { from } as any;

    await expect(changeUserRole(supabase, "admin-1", "admin-1", "user")).rejects.toThrow(ForbiddenError);

    expect(from).not.toHaveBeenCalled();
    expect(insertAuditLog).not.toHaveBeenCalled();
    expect(notifyUser).not.toHaveBeenCalled();
  });

  it("throws if the role name is unknown and performs no mutation or logging", async () => {
    const rolesSingle = vi.fn().mockResolvedValue({ data: null, error: null });
    const rolesEq = vi.fn().mockReturnValue({ single: rolesSingle });
    const rolesSelect = vi.fn().mockReturnValue({ eq: rolesEq });
    const from = vi.fn((table: string) => {
      if (table === "roles") return { select: rolesSelect };
      throw new Error(`unexpected table ${table}`);
    });
    const supabase = { from } as any;

    await expect(changeUserRole(supabase, "admin-1", "u1", "superadmin")).rejects.toThrow();
    expect(insertAuditLog).not.toHaveBeenCalled();
    expect(notifyUser).not.toHaveBeenCalled();
  });
});

describe("adminService.setAccountStatus", () => {
  it("requires users:suspend, updates status via the caller's own client, and logs/notifies via the service-role admin client", async () => {
    const eq = vi.fn().mockResolvedValue({ error: null });
    const update = vi.fn().mockReturnValue({ eq });
    const supabase = { from: vi.fn().mockReturnValue({ update }) } as any;

    await setAccountStatus(supabase, "admin-1", "u1", "suspended");

    expect(requirePermission).toHaveBeenCalledWith(supabase, "admin-1", "users:suspend");
    expect(supabase.from).toHaveBeenCalledWith("users");
    expect(update).toHaveBeenCalledWith({ account_status: "suspended" });
    expect(eq).toHaveBeenCalledWith("id", "u1");

    expect(insertAuditLog).toHaveBeenCalledWith(
      adminSupabase,
      expect.objectContaining({ actor_id: "admin-1", target_id: "u1", action: "user.status_changed" })
    );
    expect(notifyUser).toHaveBeenCalledWith(adminSupabase, "u1", expect.objectContaining({ type: "account_status" }));

    expect(insertAuditLog).not.toHaveBeenCalledWith(supabase, expect.anything());
    expect(notifyUser).not.toHaveBeenCalledWith(supabase, expect.anything(), expect.anything());
  });

  it("refuses to suspend the caller's own account (self-lockout has no recovery path)", async () => {
    const from = vi.fn();
    const supabase = { from } as any;

    await expect(setAccountStatus(supabase, "admin-1", "admin-1", "suspended")).rejects.toThrow(ForbiddenError);

    expect(from).not.toHaveBeenCalled();
    expect(insertAuditLog).not.toHaveBeenCalled();
    expect(notifyUser).not.toHaveBeenCalled();
  });
});
