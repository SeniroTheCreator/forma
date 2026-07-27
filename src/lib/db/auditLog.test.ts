import { describe, it, expect, vi } from "vitest";
import { insertAuditLog } from "./auditLog";

describe("db/auditLog", () => {
  it("inserts an audit_log row", async () => {
    const insert = vi.fn().mockResolvedValue({ error: null });
    const supabase = { from: vi.fn().mockReturnValue({ insert }) } as any;

    await insertAuditLog(supabase, {
      actor_id: "admin-1",
      action: "user.role_changed",
      target_type: "user",
      target_id: "u1",
      metadata: { newRole: "admin" },
    });

    expect(supabase.from).toHaveBeenCalledWith("audit_log");
    expect(insert).toHaveBeenCalled();
  });

  it("throws when the insert fails", async () => {
    const insert = vi.fn().mockResolvedValue({ error: new Error("boom") });
    const supabase = { from: vi.fn().mockReturnValue({ insert }) } as any;

    await expect(
      insertAuditLog(supabase, {
        actor_id: "admin-1",
        action: "user.status_changed",
        target_type: "user",
        target_id: "u1",
        metadata: { newStatus: "suspended" },
      })
    ).rejects.toThrow("boom");
  });
});
