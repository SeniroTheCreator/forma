import { describe, it, expect, vi } from "vitest";

vi.mock("@/lib/db/files", () => ({
  insertFileRecord: vi.fn().mockResolvedValue({ id: "f1", path: "avatars/u1-123.png" }),
}));

import { uploadAvatar } from "./fileService";

describe("fileService.uploadAvatar", () => {
  it("uploads to the avatars bucket and records the file", async () => {
    const upload = vi.fn().mockResolvedValue({ data: { path: "avatars/u1-123.png" }, error: null });
    const supabase = { storage: { from: vi.fn().mockReturnValue({ upload }) } } as any;
    const file = new File(["fake-bytes"], "avatar.png", { type: "image/png" });

    const result = await uploadAvatar(supabase, "u1", file);

    expect(supabase.storage.from).toHaveBeenCalledWith("avatars");
    expect(result.path).toBe("avatars/u1-123.png");
  });

  it("rejects files larger than 5MB", async () => {
    const supabase = { storage: { from: vi.fn() } } as any;
    const bigFile = new File([new Uint8Array(6 * 1024 * 1024)], "big.png", { type: "image/png" });
    await expect(uploadAvatar(supabase, "u1", bigFile)).rejects.toThrow();
  });
});
