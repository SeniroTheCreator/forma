export default function AboutPage() {
  return (
    <section className="mx-auto max-w-2xl px-4 py-16 sm:px-6 sm:py-24 lg:px-8">
      <h1 className="text-3xl font-semibold tracking-tight text-foreground">About Forma</h1>
      <div className="mt-6 space-y-4 text-sm leading-relaxed text-muted-foreground">
        <p>
          Forma is a foundation for building web products — the account, permissions, and admin
          plumbing that nearly every application needs, already built, tested, and running.
        </p>
        <p>
          Instead of starting from a blank page every time, Forma gives you a working sign-in
          flow, role-based access control, an admin panel, file storage, and notifications from
          day one — so the work you do goes into the parts of the product that are actually yours.
        </p>
        <p>
          Every permission check is enforced twice: once in the application, and once again at
          the database level, so a mistake in one place doesn&apos;t become a security hole.
        </p>
      </div>
    </section>
  );
}
