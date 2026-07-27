import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/db/files", () => ({
  insertFileRecord: vi.fn().mockResolvedValue({ id: "f1", path: "u1/123.png" }),
}));
vi.mock("@/lib/db/users", () => ({
  updateUser: vi.fn().mockResolvedValue(undefined),
}));

import { uploadAvatar } from "./fileService";
import { insertFileRecord } from "@/lib/db/files";
import { updateUser } from "@/lib/db/users";
import { ValidationError } from "@/lib/errors/AppError";

function makeSupabaseMock() {
  const upload = vi.fn().mockResolvedValue({ data: { path: "u1/123.png" }, error: null });
  const getPublicUrl = vi.fn().mockReturnValue({ data: { publicUrl: "http://storage.local/avatars/u1/123.png" } });
  return {
    supabase: { storage: { from: vi.fn().mockReturnValue({ upload, getPublicUrl }) } } as any,
    upload,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("fileService.uploadAvatar", () => {
  it("uploads to the avatars bucket and records the file", async () => {
    const { supabase } = makeSupabaseMock();
    const file = new File(["fake-bytes"], "avatar.png", { type: "image/png" });

    const result = await uploadAvatar(supabase, "u1", file);

    expect(supabase.storage.from).toHaveBeenCalledWith("avatars");
    expect(insertFileRecord).toHaveBeenCalled();
    expect(result.path).toBe("u1/123.png");
  });

  it("persists the resulting public URL to users.avatar_url so it can be read back", async () => {
    const { supabase } = makeSupabaseMock();
    const file = new File(["fake-bytes"], "avatar.png", { type: "image/png" });

    const result = await uploadAvatar(supabase, "u1", file);

    expect(updateUser).toHaveBeenCalledWith(supabase, "u1", {
      avatar_url: "http://storage.local/avatars/u1/123.png",
    });
    expect(result.publicUrl).toBe("http://storage.local/avatars/u1/123.png");
  });

  it("rejects files larger than 5MB", async () => {
    const { supabase, upload } = makeSupabaseMock();
    const bigFile = new File([new Uint8Array(6 * 1024 * 1024)], "big.png", { type: "image/png" });

    await expect(uploadAvatar(supabase, "u1", bigFile)).rejects.toThrow(ValidationError);
    expect(upload).not.toHaveBeenCalled();
  });

  it.each(["application/pdf", "text/html", "application/x-msdownload", ""])(
    "rejects content type %s before attempting the upload",
    async (mimeType) => {
      const { supabase, upload } = makeSupabaseMock();
      const file = new File(["not-an-image"], "payload.bin", { type: mimeType });

      await expect(uploadAvatar(supabase, "u1", file)).rejects.toThrow(ValidationError);

      // Rejected up front, rather than left to the bucket's allowed_mime_types to bounce.
      expect(upload).not.toHaveBeenCalled();
      expect(insertFileRecord).not.toHaveBeenCalled();
      expect(updateUser).not.toHaveBeenCalled();
    }
  );

  it.each(["image/png", "image/jpeg", "image/webp", "image/gif"])("accepts content type %s", async (mimeType) => {
    const { supabase, upload } = makeSupabaseMock();
    const file = new File(["fake-bytes"], "avatar", { type: mimeType });

    await expect(uploadAvatar(supabase, "u1", file)).resolves.toBeDefined();
    expect(upload).toHaveBeenCalled();
  });
});
