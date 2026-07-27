const footerLinks = [
  { href: "/about", label: "About" },
  { href: "/privacy", label: "Privacy" },
  { href: "/terms", label: "Terms" },
];

export function Footer() {
  return (
    <footer className="border-t border-zinc-200 bg-white">
      <div className="mx-auto flex max-w-6xl flex-col items-center gap-4 px-4 py-8 sm:flex-row sm:justify-between sm:px-6 lg:px-8">
        <p className="text-sm text-zinc-500">
          &copy; {new Date().getFullYear()} Foundation. All rights reserved.
        </p>

        <nav className="flex items-center gap-6">
          {footerLinks.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="text-sm text-zinc-500 transition-colors hover:text-zinc-900"
            >
              {link.label}
            </a>
          ))}
        </nav>
      </div>
    </footer>
  );
}
