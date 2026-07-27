import { describe, it, expect } from "vitest";
import { securityHeaders } from "./headers";

describe("securityHeaders", () => {
  it("includes the required security headers", () => {
    const keys = securityHeaders.map((h) => h.key);
    expect(keys).toContain("Content-Security-Policy");
    expect(keys).toContain("X-Frame-Options");
    expect(keys).toContain("X-Content-Type-Options");
    expect(keys).toContain("Referrer-Policy");
    expect(keys).toContain("Permissions-Policy");
    expect(keys).toContain("Strict-Transport-Security");
  });

  it.each([
    "default-src 'self'",
    "frame-ancestors 'none'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ])("declares the %s CSP directive", (directive) => {
    const csp = securityHeaders.find((h) => h.key === "Content-Security-Policy")!.value;
    expect(csp).toContain(directive);
  });

  it("emits the CSP as a single semicolon-separated header value", () => {
    const csp = securityHeaders.find((h) => h.key === "Content-Security-Policy")!.value;
    expect(csp).not.toContain(";;");
    expect(csp.endsWith(";")).toBe(true);
  });
});
