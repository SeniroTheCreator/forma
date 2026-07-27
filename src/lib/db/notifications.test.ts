import { describe, it, expect, vi } from "vitest";
import { listNotificationsForUser, markNotificationRead, insertNotification } from "./notifications";

describe("db/notifications", () => {
  it("listNotificationsForUser queries by recipient_id ordered by created_at desc", async () => {
    const order = vi.fn().mockResolvedValue({ data: [{ id: "n1" }], error: null });
    const eq = vi.fn().mockReturnValue({ order });
    const select = vi.fn().mockReturnValue({ eq });
    const supabase = { from: vi.fn().mockReturnValue({ select }) } as any;

    const result = await listNotificationsForUser(supabase, "u1");

    expect(supabase.from).toHaveBeenCalledWith("notifications");
    expect(eq).toHaveBeenCalledWith("recipient_id", "u1");
    expect(result).toEqual([{ id: "n1" }]);
  });

  it("markNotificationRead sets read_at", async () => {
    const eq = vi.fn().mockResolvedValue({ error: null });
    const update = vi.fn().mockReturnValue({ eq });
    const supabase = { from: vi.fn().mockReturnValue({ update }) } as any;

    await markNotificationRead(supabase, "n1");

    expect(update).toHaveBeenCalledWith(expect.objectContaining({ read_at: expect.any(String) }));
  });

  it("insertNotification inserts a row", async () => {
    const insert = vi.fn().mockResolvedValue({ error: null });
    const supabase = { from: vi.fn().mockReturnValue({ insert }) } as any;

    await insertNotification(supabase, { recipient_id: "u1", type: "test", title: "Hi", message: "Hello" });

    expect(insert).toHaveBeenCalled();
  });
});
