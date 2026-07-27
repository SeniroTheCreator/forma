import { describe, it, expect, vi } from "vitest";

vi.mock("@/lib/db/users", () => ({
  getUserById: vi.fn().mockResolvedValue({ id: "u1", first_name: "Ada", last_name: "Lovelace" }),
  updateUser: vi.fn().mockResolvedValue(undefined),
}));

import { getProfile, updateProfile } from "./userService";
import { updateUser } from "@/lib/db/users";
import { ForbiddenError } from "@/lib/errors/AppError";

describe("userService", () => {
  it("getProfile returns the caller's own profile", async () => {
    const result = await getProfile({} as any, "u1", "u1");
    expect(result.id).toBe("u1");
  });

  it("updateProfile throws ForbiddenError when updating someone else's profile", async () => {
    await expect(updateProfile({} as any, "u1", "u2", { firstName: "X", lastName: "Y" })).rejects.toThrow(ForbiddenError);
  });

  it("updateProfile updates when the caller owns the profile", async () => {
    await updateProfile({} as any, "u1", "u1", { firstName: "Grace", lastName: "Hopper" });
    expect(updateUser).toHaveBeenCalledWith({}, "u1", { first_name: "Grace", last_name: "Hopper" });
  });
});
