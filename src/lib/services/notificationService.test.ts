import { describe, it, expect, vi } from "vitest";

vi.mock("@/lib/db/notifications", () => ({
  insertNotification: vi.fn().mockResolvedValue(undefined),
}));

import { notifyUser } from "./notificationService";
import { insertNotification } from "@/lib/db/notifications";

describe("notificationService.notifyUser", () => {
  it("inserts a notification for the recipient", async () => {
    await notifyUser({} as any, "u1", { type: "account", title: "Welcome", message: "Thanks for joining" });
    expect(insertNotification).toHaveBeenCalledWith({}, {
      recipient_id: "u1",
      type: "account",
      title: "Welcome",
      message: "Thanks for joining",
    });
  });
});
