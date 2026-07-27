import { describe, it, expect } from "vitest";
import { getPasswordStrength } from "./passwordStrength";

describe("getPasswordStrength", () => {
  it("returns null for an empty password", () => {
    expect(getPasswordStrength("")).toBeNull();
  });

  it("rates a short password as weak", () => {
    expect(getPasswordStrength("abc123")).toEqual({ score: 1, label: "Weak" });
  });

  it("rates a longer password with two character classes as good", () => {
    expect(getPasswordStrength("correcthorse1")).toEqual({ score: 2, label: "Good" });
  });

  it("rates a long password with three+ character classes as strong", () => {
    expect(getPasswordStrength("Correct-Horse-Battery1")).toEqual({ score: 3, label: "Strong" });
  });
});
