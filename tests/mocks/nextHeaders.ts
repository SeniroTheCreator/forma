// Test-only stand-in for "next/headers", aliased in vitest.config.ts.
//
// Next's real `headers()`/`cookies()` require the App Router's per-request
// AsyncLocalStorage store, which only exists when Next itself is handling an
// HTTP request. Integration tests invoke Server Actions directly (no HTTP
// layer), so those calls throw "called outside a request scope" unless
// stubbed. These stand-ins are plain, standards-based equivalents — no
// Supabase or business logic is mocked, only Next's request-context plumbing.

export async function headers(): Promise<Headers> {
  return new Headers();
}

export interface StubCookie {
  name: string;
  value: string;
}

export interface StubCookieStore {
  getAll(): StubCookie[];
  get(name: string): StubCookie | undefined;
  set(name: string, value: string, options?: unknown): void;
}

export async function cookies(): Promise<StubCookieStore> {
  const store = new Map<string, string>();
  return {
    getAll: () => Array.from(store.entries()).map(([name, value]) => ({ name, value })),
    get: (name: string) => (store.has(name) ? { name, value: store.get(name)! } : undefined),
    set: (name: string, value: string) => {
      store.set(name, value);
    },
  };
}
