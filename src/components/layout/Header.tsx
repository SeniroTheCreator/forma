"use client";

import Link from "next/link";
import { useTranslation } from "@/lib/i18n/useTranslation";
import { LanguageToggle } from "@/components/features/marketing/LanguageToggle";

export function Header() {
  const { t } = useTranslation();

  return (
    <header className="border-b border-border bg-background">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link href="/" className="flex items-center gap-2 text-[15px] font-semibold tracking-tight text-foreground">
          <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
            <path d="M8 1L15 8L8 15L1 8Z" stroke="currentColor" strokeWidth="1.2" fill="none" />
          </svg>
          Forma
        </Link>

        <nav className="hidden items-center gap-8 md:flex">
          <a href="#features" className="text-sm text-muted-foreground transition-colors hover:text-foreground">
            {t.nav.features}
          </a>
          <Link href="/about" className="text-sm text-muted-foreground transition-colors hover:text-foreground">
            {t.nav.about}
          </Link>
        </nav>

        <div className="flex items-center gap-4">
          <LanguageToggle />
          <Link href="/login" className="hidden text-sm text-muted-foreground transition-colors hover:text-foreground sm:inline">
            {t.nav.login}
          </Link>
          <Link
            href="/signup"
            className="rounded-md bg-foreground px-4 py-2 text-sm font-medium text-background transition-colors hover:opacity-90"
          >
            {t.nav.getStarted}
          </Link>
        </div>
      </div>
    </header>
  );
}
