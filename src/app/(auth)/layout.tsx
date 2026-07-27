export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="dark flex min-h-screen items-center justify-center bg-background px-4 text-foreground">
      <div className="w-full max-w-sm">{children}</div>
    </div>
  );
}
