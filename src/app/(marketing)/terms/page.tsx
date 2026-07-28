"use client";

import { useTranslation } from "@/lib/i18n/useTranslation";

export default function TermsPage() {
  const { t } = useTranslation();
  const terms = t.legal.terms;

  return (
    <section className="mx-auto max-w-2xl px-4 py-16 sm:px-6 sm:py-24 lg:px-8">
      <h1 className="text-3xl font-semibold tracking-tight text-foreground">{terms.title}</h1>

      <div className="mt-6 rounded-md border border-warn/30 bg-warn/10 px-4 py-3 text-sm text-warn">
        <strong className="font-semibold">{terms.draftNotice.label}</strong> {terms.draftNotice.body}
      </div>

      <div className="mt-8 space-y-8 text-sm leading-relaxed text-muted-foreground">
        {terms.sections.map((section) => (
          <div key={section.heading}>
            <h2 className="text-base font-semibold text-foreground">{section.heading}</h2>
            <p className="mt-2">{section.body}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
