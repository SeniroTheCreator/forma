import { describe, it, expect } from "vitest";
import { listUsersQuerySchema, updateUserSchema } from "./adminSchemas";

describe("listUsersQuerySchema", () => {
  it("defaults page to 1 and leaves search undefined when both are absent", () => {
    const result = listUsersQuerySchema.parse({});
    expect(result).toEqual({ page: 1 });
  });

  it("coerces a numeric page string", () => {
    expect(listUsersQuerySchema.parse({ page: "3" }).page).toBe(3);
  });

  it("rejects a non-positive or non-numeric page", () => {
    expect(listUsersQuerySchema.safeParse({ page: "0" }).success).toBe(false);
    expect(listUsersQuerySchema.safeParse({ page: "abc" }).success).toBe(false);
  });

  it("accepts an ordinary name or email search term, dots included", () => {
    expect(listUsersQuerySchema.parse({ search: "jane.doe@example.com" }).search).toBe("jane.doe@example.com");
    expect(listUsersQuerySchema.parse({ search: "  jane  " }).search).toBe("jane");
  });

  it.each([
    ['a comma', 'x,account_status.eq.suspended'],
    ['a closing paren', "x)"],
    ["an opening paren", "or(" ],
    ["a double quote", 'x"'],
    ["a backslash", "x\\"],
  ])("rejects a search term containing %s (PostgREST filter structure)", (_label, term) => {
    expect(listUsersQuerySchema.safeParse({ search: term }).success).toBe(false);
  });

  it("rejects a search term longer than 100 characters", () => {
    expect(listUsersQuerySchema.safeParse({ search: "a".repeat(101) }).success).toBe(false);
  });
});

describe("updateUserSchema", () => {
  it("accepts a role-only or status-only body", () => {
    expect(updateUserSchema.parse({ role: "admin" })).toEqual({ role: "admin" });
    expect(updateUserSchema.parse({ status: "suspended" })).toEqual({ status: "suspended" });
  });

  it("rejects an empty body", () => {
    expect(updateUserSchema.safeParse({}).success).toBe(false);
  });

  it("rejects an unknown status", () => {
    expect(updateUserSchema.safeParse({ status: "deleted" }).success).toBe(false);
  });
});
