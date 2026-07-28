import { LanguageToggle } from "@/components/features/marketing/LanguageToggle";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="dark relative flex min-h-screen items-center justify-center bg-background px-4 text-foreground">
      <div className="absolute top-4 right-4 sm:top-6 sm:right-6">
        <LanguageToggle />
      </div>
      <div className="w-full max-w-sm">{children}</div>
    </div>
  );
}
