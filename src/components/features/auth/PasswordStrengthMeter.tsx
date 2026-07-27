"use client";

import { getPasswordStrength } from "@/lib/passwordStrength";

const SEGMENT_COLOR = {
  1: "bg-red-500",
  2: "bg-warn",
  3: "bg-ok",
} as const;

export function PasswordStrengthMeter({ password, show }: { password: string; show: boolean }) {
  const strength = getPasswordStrength(password);
  const expanded = show && strength !== null;

  return (
    <div
      className={`grid transition-all duration-200 ease-out ${
        expanded ? "mt-2 grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
      }`}
    >
      <div className="overflow-hidden">
        <div className="flex gap-1.5">
          {[1, 2, 3].map((segment) => (
            <div
              key={segment}
              className={`h-1.5 flex-1 rounded-full transition-colors duration-200 ${
                strength && strength.score >= segment ? SEGMENT_COLOR[strength.score] : "bg-muted"
              }`}
            />
          ))}
        </div>
        {strength && <p className="mt-1.5 text-xs text-muted-foreground">{strength.label} password</p>}
      </div>
    </div>
  );
}
