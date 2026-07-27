import Link from "next/link";

const features = [
  {
    title: "Authentication, ready to go",
    description:
      "Signup, login, email verification, and password recovery are wired up from the start, so you don't have to build them again.",
  },
  {
    title: "Permissions built in",
    description:
      "Role-based access control lets you decide who can see and do what, without bolting it on after the fact.",
  },
  {
    title: "Secure by default",
    description:
      "Sensible security headers, request validation, and rate limiting are configured out of the box, not left as an afterthought.",
  },
  {
    title: "Ready to scale",
    description:
      "A structured database, file storage, and notifications are already in place so you can focus on what makes your product different.",
  },
];

export default function LandingPage() {
  return (
    <>
      <section className="mx-auto max-w-6xl px-4 pt-20 pb-16 text-center sm:px-6 sm:pt-28 sm:pb-24 lg:px-8">
        <h1 className="text-4xl font-bold tracking-tight text-zinc-900 sm:text-5xl md:text-6xl">
          A foundation you can build anything on.
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-lg text-zinc-600 sm:text-xl">
          Authentication, permissions, and security are already handled, so you can skip the
          boilerplate and start building the product you actually set out to make.
        </p>
        <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
          <Link
            href="/signup"
            className="w-full rounded-md bg-zinc-900 px-6 py-3 text-base font-medium text-white transition-colors hover:bg-zinc-700 sm:w-auto"
          >
            Get started
          </Link>
          <Link
            href="/login"
            className="w-full rounded-md border border-zinc-300 px-6 py-3 text-base font-medium text-zinc-700 transition-colors hover:bg-zinc-50 sm:w-auto"
          >
            Log in
          </Link>
        </div>
      </section>

      <section id="features" className="border-t border-zinc-200 bg-zinc-50">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-24 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-semibold tracking-tight text-zinc-900 sm:text-4xl">
              Everything a new product needs on day one
            </h2>
            <p className="mt-4 text-lg text-zinc-600">
              The pieces every application needs, already in place, so you can spend your time on
              what makes yours different.
            </p>
          </div>

          <div className="mt-12 grid grid-cols-1 gap-6 sm:grid-cols-2 md:grid-cols-4">
            {features.map((feature) => (
              <div
                key={feature.title}
                className="rounded-lg border border-zinc-200 bg-white p-6 shadow-sm"
              >
                <h3 className="text-base font-semibold text-zinc-900">{feature.title}</h3>
                <p className="mt-2 text-sm text-zinc-600">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="border-t border-zinc-200 bg-white">
        <div className="mx-auto max-w-6xl px-4 py-16 text-center sm:px-6 sm:py-24 lg:px-8">
          <h2 className="text-3xl font-semibold tracking-tight text-zinc-900 sm:text-4xl">
            Ready to start building?
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-lg text-zinc-600">
            Create an account and get straight to building the product on top of a foundation
            that&apos;s already handling the rest.
          </p>
          <div className="mt-8">
            <Link
              href="/signup"
              className="inline-block rounded-md bg-zinc-900 px-6 py-3 text-base font-medium text-white transition-colors hover:bg-zinc-700"
            >
              Create your account
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
