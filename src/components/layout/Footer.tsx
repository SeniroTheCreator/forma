"use client";

import Link from "next/link";
import { useTranslation } from "@/lib/i18n/useTranslation";

export function Footer() {
  const { t } = useTranslation();

  return (
    <footer className="border-t border-border bg-background">
      <div className="mx-auto flex max-w-6xl flex-col items-center gap-4 px-4 py-8 text-muted-foreground sm:flex-row sm:justify-between sm:px-6 lg:px-8">
        <p className="text-sm">
          &copy; {new Date().getFullYear()} Forma. {t.footer.rights}
        </p>

        <nav className="flex items-center gap-6">
          <Link href="/about" className="text-sm transition-colors hover:text-foreground">
            {t.nav.about}
          </Link>
          <Link href="/privacy" className="text-sm transition-colors hover:text-foreground">
            {t.nav.privacy}
          </Link>
          <Link href="/terms" className="text-sm transition-colors hover:text-foreground">
            {t.nav.terms}
          </Link>
        </nav>
      </div>
    </footer>
  );
}
