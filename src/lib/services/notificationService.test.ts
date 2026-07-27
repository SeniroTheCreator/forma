import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/db/notifications", () => ({
  insertNotification: vi.fn().mockResolvedValue(undefined),
  listNotificationsForUser: vi.fn().mockResolvedValue([{ id: "n1" }]),
  markNotificationRead: vi.fn().mockResolvedValue(1),
}));

import { notifyUser, listForUser, markRead } from "./notificationService";
import { insertNotification, listNotificationsForUser, markNotificationRead } from "@/lib/db/notifications";
import { NotFoundError } from "@/lib/errors/AppError";

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(markNotificationRead).mockResolvedValue(1);
});

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

describe("notificationService.listForUser", () => {
  it("lists the caller's own notifications", async () => {
    await expect(listForUser({} as any, "u1")).resolves.toEqual([{ id: "n1" }]);
    expect(listNotificationsForUser).toHaveBeenCalledWith({}, "u1");
  });
});

describe("notificationService.markRead", () => {
  it("scopes the update to the caller, not just to the notification id", async () => {
    await markRead({} as any, "u1", "n1");
    expect(markNotificationRead).toHaveBeenCalledWith({}, "n1", "u1");
  });

  it("throws NotFoundError when no row matched (someone else's notification, or none)", async () => {
    // RLS denies a cross-user UPDATE by silently matching 0 rows, so without this the
    // caller would get {success: true} for a notification that was never theirs.
    vi.mocked(markNotificationRead).mockResolvedValue(0);

    await expect(markRead({} as any, "u1", "someone-elses-notification")).rejects.toThrow(NotFoundError);
  });
});
