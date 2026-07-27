import { describe, it, expect, vi } from "vitest";
import { listNotificationsForUser, markNotificationRead, insertNotification } from "./notifications";
import { mockSupabase } from "@/lib/testing/mockSupabase";

describe("db/notifications", () => {
  it("listNotificationsForUser queries by recipient_id ordered by created_at desc", async () => {
    const order = vi.fn().mockResolvedValue({ data: [{ id: "n1" }], error: null });
    const eq = vi.fn().mockReturnValue({ order });
    const select = vi.fn().mockReturnValue({ eq });
    const supabase = mockSupabase({ from: vi.fn().mockReturnValue({ select }) });

    const result = await listNotificationsForUser(supabase, "u1");

    expect(supabase.from).toHaveBeenCalledWith("notifications");
    expect(eq).toHaveBeenCalledWith("recipient_id", "u1");
    expect(result).toEqual([{ id: "n1" }]);
  });

  it("markNotificationRead sets read_at, scoped to both the id and the recipient", async () => {
    const select = vi.fn().mockResolvedValue({ data: [{ id: "n1" }], error: null });
    const recipientEq = vi.fn().mockReturnValue({ select });
    const idEq = vi.fn().mockReturnValue({ eq: recipientEq });
    const update = vi.fn().mockReturnValue({ eq: idEq });
    const supabase = mockSupabase({ from: vi.fn().mockReturnValue({ update }) });

    const updated = await markNotificationRead(supabase, "n1", "u1");

    expect(update).toHaveBeenCalledWith(expect.objectContaining({ read_at: expect.any(String) }));
    expect(idEq).toHaveBeenCalledWith("id", "n1");
    expect(recipientEq).toHaveBeenCalledWith("recipient_id", "u1");
    expect(updated).toBe(1);
  });

  it("markNotificationRead reports 0 rows when nothing matched", async () => {
    const select = vi.fn().mockResolvedValue({ data: [], error: null });
    const recipientEq = vi.fn().mockReturnValue({ select });
    const idEq = vi.fn().mockReturnValue({ eq: recipientEq });
    const update = vi.fn().mockReturnValue({ eq: idEq });
    const supabase = mockSupabase({ from: vi.fn().mockReturnValue({ update }) });

    await expect(markNotificationRead(supabase, "n1", "someone-else")).resolves.toBe(0);
  });

  it("insertNotification inserts a row", async () => {
    const insert = vi.fn().mockResolvedValue({ error: null });
    const supabase = mockSupabase({ from: vi.fn().mockReturnValue({ insert }) });

    await insertNotification(supabase, { recipient_id: "u1", type: "test", title: "Hi", message: "Hello" });

    expect(insert).toHaveBeenCalled();
  });
});
