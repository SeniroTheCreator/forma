import { describe, it, expect, vi } from "vitest";
import { getUserById, updateUser } from "./users";
import { mockSupabase } from "@/lib/testing/mockSupabase";

function makeSupabaseMock(row: Record<string, unknown>) {
  const single = vi.fn().mockResolvedValue({ data: row, error: null });
  const eq = vi.fn().mockReturnValue({ single });
  const select = vi.fn().mockReturnValue({ eq });
  const updateEq = vi.fn().mockResolvedValue({ error: null });
  const update = vi.fn().mockReturnValue({ eq: updateEq });
  return mockSupabase({ from: vi.fn().mockReturnValue({ select, update }) });
}

describe("db/users", () => {
  it("getUserById selects by id and returns the row", async () => {
    const supabase = makeSupabaseMock({ id: "u1", first_name: "Ada", last_name: "Lovelace" });
    const result = await getUserById(supabase, "u1");
    expect(result).toEqual({ id: "u1", first_name: "Ada", last_name: "Lovelace" });
    expect(supabase.from).toHaveBeenCalledWith("users");
  });

  it("updateUser updates the row by id", async () => {
    const supabase = makeSupabaseMock({});
    await updateUser(supabase, "u1", { first_name: "Grace", last_name: "Hopper" });
    expect(supabase.from).toHaveBeenCalledWith("users");
  });
});
