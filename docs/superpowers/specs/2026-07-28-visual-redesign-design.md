# Visual Redesign & UX Polish — Design Spec

Date: 2026-07-28
Status: Approved (validated interactively via the visual brainstorming companion — see conversation, not a separate written review round)

## Goal

Replace Forma's placeholder shadcn-default visual identity with a distinctive, approved design direction, and add several interactivity/UX improvements to the auth flow, plus legal placeholder pages and a landing-page language toggle.

## Visual direction

Dark, technical, "governed action" aesthetic — inspired by obsidianintelligence.ai's structural language (dark surface, monospace accents, verb-tagged feature cards, a live-feeling activity strip), populated entirely with Forma's own content. Explicitly **not** the warm-cream-serif "AI slop" look (rejected twice), and not literally cloned from Claude/Anthropic's brand.

**Rejected direction, for the record:** warm cream (#F7F4EC) + serif (Fraunces) + terracotta accent + architectural blueprint motif. User's verdict: "still feels generic/AI-slop, just a different flavor of it" — even careful execution of an over-used cluster reads as templated.

**Tokens:**
- `--bg`: `#0A0A0B` (near-black)
- `--surface`: `#131316` (cards/panels)
- `--border`: `rgba(255,255,255,0.08)` (hairline)
- `--text`: `#F2F2F0`
- `--text-muted`: `#8A8A8F`
- `--ok` (functional only, never decorative): `#4ADE80`
- `--warn` (functional only): `#FBBF24`
- Typography: Geist Sans (already in the project) for body/headlines, Geist Mono (already in the project) for small tags/labels. No new font dependency.
- No single "brand accent" color splashed everywhere — restraint matches the reference; color is used only where it's functionally meaningful (status, not decoration).

**Landing page structure** (validated in the mockup, `obsidian-direction-v3.html` in `.superpowers/brainstorm/`):
1. Nav — wordmark, Features/About/Log in, "Get started" button
2. Activity strip — plain-English, not technical jargon (e.g. "New account created · Access granted to a teammate · A suspicious login was blocked" — NOT raw log lines like "PERMISSION check users:write ALLOWED"). This was corrected once already: first pass used nerdy technical strings, user said "no need for nerdy stuff at the top, the average customer does not know what this is."
3. Hero — headline + subhead + two CTAs, alongside a small product-preview card (stylized mock of the actual admin user list with role badges) instead of an abstract shape
4. Reassurance line — plain text, no dev-facing metrics (a first pass showed "119 automated tests / 100% database rows access-checked" — explicitly rejected: "we wont need automated tests, database rows access-checked etc, so you know what kind of audience to target" — the real end-audience is a general business/consumer audience, not developers)
5. Feature grid — 6 cards (Sessions, Roles, Admin panel, Files, Notifications, Audit log), everyday language, no jargon
6. CTA section
7. Footer — About / Privacy / Terms links (pages didn't exist before this spec)

**Important constraint carried forward:** do not add any logistics/trucking-specific content anywhere yet. The user's eventual real product is logistics-industry, but that's future work with its own reference brief still to come — this pass stays generic/foundation-appropriate.

## Auth flow UX additions

Apply the new dark visual system to all `(auth)` pages (signup, login, forgot-password, reset-password, verify-email) and the shared `AuthLayout`.

1. **Go-back control** on signup and login pages — a back arrow/link (e.g. to the landing page, or browser-back) near the top of the auth card, so a user who lands there by mistake isn't stuck.
2. **Placeholder text in inputs** — e.g. `placeholder="e.g. John"` on First name, `placeholder="e.g. Smith"` on Last name, `placeholder="you@example.com"` on Email. Applies to every text/email input across signup, login, forgot/reset password forms.
3. **Password strength meter** — on the password field (signup, reset-password): when the field is focused/has content, smoothly animate in (height/opacity transition) a strength bar below it with 3 color segments (red/yellow/green) that fill based on password strength (length + character-class variety — a simple local heuristic, no new dependency needed). Collapses smoothly away when the field loses focus and is empty.
4. **More real-time validation feedback** — extend beyond current on-submit-only validation: surface field errors (e.g. "passwords do not match") as the user types/blurs, not only after clicking submit, using `react-hook-form`'s `mode: "onChange"` or `onBlur` (already the form library in use — no new dependency).

## Legal pages

`/about`, `/privacy`, `/terms` — currently linked from the footer but don't exist (404). Per earlier discussion: **not real legal advice**. Generic, reasonable-sounding placeholder content (the kind most SaaS templates ship with), styled to match the new dark theme, with a visible, honest notice that it's a draft pending real legal review before the app handles real user data at scale. `/about` can be genuinely descriptive of Forma (no legal caveat needed there, just factual/marketing copy).

## Landing-page language toggle (English/Greek)

Scope, per the user's own wording ("in the main page add a select language button") — **the landing page only**, not the authenticated app (dashboard/admin/settings) or the auth flow. A client-side toggle (EN/ΕΛ) that swaps the landing page's own copy between English and Greek, persisted (localStorage) so it's remembered on return visits. No new i18n library dependency, no URL restructuring (no `/en/`, `/el/` path prefixes) — this is intentionally lightweight given the explicit scope is one page, not the whole app. If the user later wants full-app i18n, that's a separate, larger design conversation (routing structure, translating the auth/dashboard/admin surface, etc.).

## Out of scope for this pass

- Logistics/trucking content (explicitly deferred)
- Full-app internationalization (dashboard, admin, auth pages) — landing page only, per explicit scope
- Real legal review of About/Privacy/Terms content
- Redesigning the dashboard/settings/admin panel's visual system (this pass covers the landing page + auth flow; the authenticated app keeping its current shadcn-light styling is an acceptable, explicitly separate follow-up if the user wants the dark theme extended there too)
