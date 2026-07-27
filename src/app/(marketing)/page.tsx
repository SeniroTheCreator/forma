"use client";

import Link from "next/link";
import { useSelector } from "react-redux";
import { selectLocale } from "@/store/slices/uiSlice";
import { landingCopy } from "@/lib/i18n/landingCopy";

export default function LandingPage() {
  const locale = useSelector(selectLocale);
  const t = landingCopy[locale];

  return (
    <>
      {/* activity strip */}
      <div className="overflow-hidden border-b border-border px-4 py-2.5 text-xs text-muted-foreground sm:px-6 lg:px-8">
        <span className="text-ok">●</span>
        {"  "}
        {t.activity.join("  ·  ")}
      </div>

      {/* hero */}
      <section className="mx-auto flex max-w-6xl flex-col items-center gap-12 px-4 pt-16 pb-16 sm:px-6 sm:pt-20 sm:pb-20 lg:flex-row lg:items-center lg:px-8 lg:pt-24 lg:pb-24">
        <div className="max-w-xl text-center lg:text-left">
          <p className="text-sm text-muted-foreground">{t.hero.eyebrow}</p>
          <h1 className="mt-5 text-4xl font-semibold tracking-tight text-foreground sm:text-5xl">
            {t.hero.headline}
          </h1>
          <p className="mt-5 text-base leading-relaxed text-muted-foreground sm:text-lg">{t.hero.subhead}</p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row lg:justify-start">
            <Link
              href="/signup"
              className="w-full rounded-md bg-foreground px-6 py-3 text-sm font-semibold text-background transition-opacity hover:opacity-90 sm:w-auto"
            >
              {t.hero.primaryCta}
            </Link>
            <Link
              href="/login"
              className="w-full rounded-md border border-white/15 px-6 py-3 text-sm font-medium text-foreground transition-colors hover:bg-white/5 sm:w-auto"
            >
              {t.hero.secondaryCta}
            </Link>
          </div>
        </div>

        {/* product preview card */}
        <div className="w-full max-w-md" aria-hidden="true">
          <div className="overflow-hidden rounded-xl border border-white/10 bg-card shadow-[0_20px_60px_rgba(0,0,0,0.5)]">
            <div className="flex gap-1.5 border-b border-white/10 px-4 py-3">
              <span className="h-2.5 w-2.5 rounded-full bg-white/15" />
              <span className="h-2.5 w-2.5 rounded-full bg-white/15" />
              <span className="h-2.5 w-2.5 rounded-full bg-white/15" />
            </div>
            <div className="space-y-1 p-5">
              <p className="mb-3 text-xs text-muted-foreground">Team members</p>
              {[
                { name: "Ada Lovelace", role: "admin", tone: "ok" },
                { name: "Grace Hopper", role: "member", tone: "neutral" },
                { name: "Alan Turing", role: "suspended", tone: "warn" },
              ].map((member) => (
                <div key={member.name} className="flex items-center justify-between border-b border-white/5 py-2.5 last:border-0">
                  <div className="flex items-center gap-2.5">
                    <span className="h-6 w-6 rounded-full bg-white/15" />
                    <span className="text-sm text-foreground">{member.name}</span>
                  </div>
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-[10.5px] ${
                      member.tone === "ok"
                        ? "bg-ok/15 text-ok"
                        : member.tone === "warn"
                          ? "bg-warn/15 text-warn"
                          : "bg-white/10 text-muted-foreground"
                    }`}
                  >
                    {member.role}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* reassurance */}
      <div className="border-y border-border px-4 py-5 text-center text-sm text-muted-foreground sm:px-6 lg:px-8">
        {t.reassurance}
      </div>

      {/* feature grid */}
      <section id="features" className="px-4 py-16 sm:px-6 sm:py-24 lg:px-8">
        <div className="mx-auto max-w-6xl">
          <div className="max-w-2xl">
            <h2 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
              {t.featuresHeading.title}
            </h2>
            <p className="mt-3 text-base text-muted-foreground">{t.featuresHeading.subtitle}</p>
          </div>

          <div className="mt-10 grid grid-cols-1 border border-border sm:grid-cols-2 lg:grid-cols-3">
            {t.features.map((feature) => (
              <div key={feature.title} className="border-b border-r border-border p-6">
                <h3 className="text-[15px] font-semibold text-foreground">{feature.title}</h3>
                <p className="mt-2 text-[13px] leading-relaxed text-muted-foreground">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="border-t border-border px-4 py-16 text-center sm:px-6 sm:py-24 lg:px-8">
        <h2 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">{t.cta.headline}</h2>
        <p className="mx-auto mt-3 max-w-xl text-sm text-muted-foreground">{t.cta.subtext}</p>
        <div className="mt-8">
          <Link
            href="/signup"
            className="inline-block rounded-md bg-foreground px-6 py-3 text-sm font-semibold text-background transition-opacity hover:opacity-90"
          >
            {t.cta.button}
          </Link>
        </div>
      </section>
    </>
  );
}
