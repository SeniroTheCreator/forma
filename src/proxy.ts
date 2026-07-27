import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { env } from "@/lib/config/env";
import type { Database } from "@/lib/supabase/database.types";

const PROTECTED_PREFIXES = ["/dashboard", "/settings", "/notifications"];
const ADMIN_PREFIXES = ["/admin"];

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient<Database>(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (cookiesToSet) => {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const path = request.nextUrl.pathname;
  const isProtected = PROTECTED_PREFIXES.some((p) => path.startsWith(p));
  const isAdmin = ADMIN_PREFIXES.some((p) => path.startsWith(p));

  if ((isProtected || isAdmin) && !user) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  if ((isProtected || isAdmin) && user) {
    // Suspension has to be enforced here, not only at login: `account_status` can flip to
    // 'suspended' at any point *during* a live session (that is exactly what the admin
    // panel's suspend button does), and the Supabase access token stays valid until it
    // expires. Without this check the whole suspend feature — its UI, audit trail,
    // notification, RLS policy and protect_account_status trigger — gates a flag that
    // stops nothing.
    //
    // `authenticated` has SELECT on public.users and the "users select own or with
    // users:read" RLS policy always permits reading one's own row, so this needs no
    // elevated client.
    const { data: profile } = await supabase.from("users").select("account_status").eq("id", user.id).single();

    if (profile?.account_status === "suspended") {
      const url = request.nextUrl.clone();
      url.pathname = "/login";
      url.search = "";
      url.searchParams.set("suspended", "1");
      const redirect = NextResponse.redirect(url);

      // Revoke the session server-side so it can't be replayed against a Route Handler or
      // Server Action (neither of which passes through this proxy's matcher).
      try {
        await supabase.auth.signOut();
      } catch {
        // Best effort: a network failure talking to GoTrue must not leave a suspended user
        // sitting on a protected page. Clearing the cookies below still ends the session
        // as far as this browser is concerned.
      }

      // signOut()'s cookie writes land on the `response` object created inside setAll
      // above, which is not what's being returned here — so clear the auth cookies on the
      // redirect response explicitly.
      for (const cookie of request.cookies.getAll()) {
        if (cookie.name.startsWith("sb-")) redirect.cookies.delete(cookie.name);
      }

      return redirect;
    }
  }

  if (isAdmin && user) {
    const { data: allowed } = await supabase.rpc("has_permission", { uid: user.id, perm_key: "admin:access" });
    if (!allowed) {
      const url = request.nextUrl.clone();
      url.pathname = "/dashboard";
      return NextResponse.redirect(url);
    }
  }

  return response;
}

export const config = {
  matcher: ["/dashboard/:path*", "/settings/:path*", "/notifications/:path*", "/admin/:path*"],
};
