export interface PasswordStrength {
  score: 1 | 2 | 3;
  label: "Weak" | "Good" | "Strong";
}

export function getPasswordStrength(password: string): PasswordStrength | null {
  if (!password) return null;

  let classes = 0;
  if (/[a-z]/.test(password)) classes++;
  if (/[A-Z]/.test(password)) classes++;
  if (/[0-9]/.test(password)) classes++;
  if (/[^a-zA-Z0-9]/.test(password)) classes++;

  if (password.length >= 12 && classes >= 3) return { score: 3, label: "Strong" };
  if (password.length >= 8 && classes >= 2) return { score: 2, label: "Good" };
  return { score: 1, label: "Weak" };
}
