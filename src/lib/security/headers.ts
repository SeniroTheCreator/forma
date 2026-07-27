// Content-Security-Policy, assembled as a directive list so each one's purpose is visible.
//
// Known limitation: `script-src`/`style-src` still allow 'unsafe-inline'. That is a
// deliberate, currently-accepted tradeoff (nonce-based CSP in the App Router is a
// non-trivial piece of work), not an oversight — see the "Known limitations / hardening
// backlog" section in docs/architecture.md.
const cspDirectives = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: https:",
  "connect-src 'self' https://*.supabase.co",
  // No page in this app is ever meant to be framed. X-Frame-Options: DENY below says the
  // same thing, but frame-ancestors is the directive modern browsers actually honour and
  // is the only one that can express anything more nuanced later.
  "frame-ancestors 'none'",
  // Nothing here uses <object>/<embed>/<applet>; blocking them removes a legacy
  // plugin-based script-execution vector that script-src does not cover.
  "object-src 'none'",
  // Stops injected markup from re-pointing every relative URL on the page at another
  // origin with a <base> tag.
  "base-uri 'self'",
  // Every form and Server Action in this app posts to this origin, so an injected form
  // that exfiltrates its input to an attacker's endpoint has no legitimate counterpart.
  "form-action 'self'",
];

export const securityHeaders = [
  { key: "Content-Security-Policy", value: `${cspDirectives.join("; ")};` },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
];
