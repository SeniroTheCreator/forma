export default function TermsPage() {
  return (
    <section className="mx-auto max-w-2xl px-4 py-16 sm:px-6 sm:py-24 lg:px-8">
      <h1 className="text-3xl font-semibold tracking-tight text-foreground">Terms of Service</h1>

      <div className="mt-6 rounded-md border border-warn/30 bg-warn/10 px-4 py-3 text-sm text-warn">
        <strong className="font-semibold">Draft, not legal advice.</strong> This is placeholder
        text describing what terms of service typically cover. It has not been reviewed by a
        lawyer and should not be relied on before this product handles real users at scale.
      </div>

      <div className="mt-8 space-y-8 text-sm leading-relaxed text-muted-foreground">
        <div>
          <h2 className="text-base font-semibold text-foreground">Accepting these terms</h2>
          <p className="mt-2">
            By creating an account, you agree to use this service in accordance with these terms.
          </p>
        </div>
        <div>
          <h2 className="text-base font-semibold text-foreground">Your account</h2>
          <p className="mt-2">
            You&apos;re responsible for keeping your password secure and for activity that happens
            under your account. Tell us if you believe your account has been accessed without your
            permission.
          </p>
        </div>
        <div>
          <h2 className="text-base font-semibold text-foreground">Acceptable use</h2>
          <p className="mt-2">
            Don&apos;t use this service to break the law, to interfere with other users, or to
            attempt to access data or accounts that aren&apos;t yours.
          </p>
        </div>
        <div>
          <h2 className="text-base font-semibold text-foreground">Suspension &amp; termination</h2>
          <p className="mt-2">
            We may suspend or close an account that violates these terms. You can close your own
            account at any time.
          </p>
        </div>
        <div>
          <h2 className="text-base font-semibold text-foreground">Changes to these terms</h2>
          <p className="mt-2">
            We may update these terms from time to time. Continued use of the service after a
            change means you accept the updated terms.
          </p>
        </div>
      </div>
    </section>
  );
}
