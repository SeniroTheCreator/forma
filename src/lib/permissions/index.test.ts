import { describe, it, expect, vi } from "vitest";
import { hasPermission, requirePermission } from "./index";
import { ForbiddenError } from "@/lib/errors/AppError";
import { mockSupabase } from "@/lib/testing/mockSupabase";

function makeSupabaseMock(result: boolean) {
  return mockSupabase({
    rpc: vi.fn().mockResolvedValue({ data: result, error: null }),
  });
}

describe("permissions", () => {
  it("hasPermission returns true when the RPC says so", async () => {
    const supabase = makeSupabaseMock(true);
    await expect(hasPermission(supabase, "user-1", "users:read")).resolves.toBe(true);
    expect(supabase.rpc).toHaveBeenCalledWith("has_permission", { uid: "user-1", perm_key: "users:read" });
  });

  it("hasPermission returns false when the RPC says so", async () => {
    const supabase = makeSupabaseMock(false);
    await expect(hasPermission(supabase, "user-1", "admin:access")).resolves.toBe(false);
  });

  it("requirePermission throws ForbiddenError when not permitted", async () => {
    const supabase = makeSupabaseMock(false);
    await expect(requirePermission(supabase, "user-1", "admin:access")).rejects.toThrow(ForbiddenError);
  });

  it("requirePermission resolves when permitted", async () => {
    const supabase = makeSupabaseMock(true);
    await expect(requirePermission(supabase, "user-1", "admin:access")).resolves.toBeUndefined();
  });
});
