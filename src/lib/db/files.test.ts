import { describe, it, expect, vi } from "vitest";
import { insertFileRecord, deleteFileRecord } from "./files";
import { mockSupabase } from "@/lib/testing/mockSupabase";

function makeSupabaseMock() {
  const single = vi.fn().mockResolvedValue({ data: { id: "f1", path: "avatars/u1.png" }, error: null });
  const select = vi.fn().mockReturnValue({ single });
  const insert = vi.fn().mockReturnValue({ select });
  const eq = vi.fn().mockResolvedValue({ error: null });
  const del = vi.fn().mockReturnValue({ eq });
  return mockSupabase({ from: vi.fn().mockReturnValue({ insert, delete: del }) });
}

describe("db/files", () => {
  it("insertFileRecord inserts and returns the row", async () => {
    const supabase = makeSupabaseMock();
    const result = await insertFileRecord(supabase, {
      owner_id: "u1",
      bucket: "avatars",
      path: "avatars/u1.png",
      filename: "u1.png",
      mime_type: "image/png",
      size_bytes: 1024,
    });
    expect(result.id).toBe("f1");
  });

  it("deleteFileRecord deletes by id", async () => {
    const supabase = makeSupabaseMock();
    await deleteFileRecord(supabase, "f1");
    expect(supabase.from).toHaveBeenCalledWith("files");
  });
});
