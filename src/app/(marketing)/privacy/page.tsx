export default function PrivacyPage() {
  return (
    <section className="mx-auto max-w-2xl px-4 py-16 sm:px-6 sm:py-24 lg:px-8">
      <h1 className="text-3xl font-semibold tracking-tight text-foreground">Privacy Policy</h1>

      <div className="mt-6 rounded-md border border-warn/30 bg-warn/10 px-4 py-3 text-sm text-warn">
        <strong className="font-semibold">Draft, not legal advice.</strong> This is placeholder
        text describing what a privacy policy typically covers. It has not been reviewed by a
        lawyer and should not be relied on before this product handles real user data.
      </div>

      <div className="mt-8 space-y-8 text-sm leading-relaxed text-muted-foreground">
        <div>
          <h2 className="text-base font-semibold text-foreground">Information we collect</h2>
          <p className="mt-2">
            When you create an account, we collect your name, email address, and password (stored
            as a secure hash, never in plain text). If you upload a profile photo, we store that
            file and a record of who uploaded it.
          </p>
        </div>
        <div>
          <h2 className="text-base font-semibold text-foreground">How we use it</h2>
          <p className="mt-2">
            We use your information to operate your account: to sign you in, to show you your own
            data, and to send you account-related email such as verification and password-reset
            messages. We do not sell your information to third parties.
          </p>
        </div>
        <div>
          <h2 className="text-base font-semibold text-foreground">Cookies</h2>
          <p className="mt-2">
            We use a small number of cookies required to keep you signed in. We do not use
            advertising or cross-site tracking cookies.
          </p>
        </div>
        <div>
          <h2 className="text-base font-semibold text-foreground">Data retention</h2>
          <p className="mt-2">
            We keep your account information for as long as your account is active. You can
            request deletion of your account and associated data at any time.
          </p>
        </div>
        <div>
          <h2 className="text-base font-semibold text-foreground">Contact</h2>
          <p className="mt-2">Questions about this policy can be sent to the site administrator.</p>
        </div>
      </div>
    </section>
  );
}
