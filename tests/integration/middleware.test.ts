// tests/integration/middleware.test.ts
import { describe, it, expect } from "vitest";

describe("middleware route protection (integration, local Supabase + dev server)", () => {
  it("redirects unauthenticated requests to /dashboard to /login", async () => {
    const res = await fetch("http://localhost:3000/dashboard", { redirect: "manual" });
    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toContain("/login");
  });

  it("redirects unauthenticated requests to /admin/users to /login", async () => {
    const res = await fetch("http://localhost:3000/admin/users", { redirect: "manual" });
    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toContain("/login");
  });
});
