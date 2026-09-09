"use client";

import { createClient } from "@neondatabase/neon-js";
import { BetterAuthReactAdapter } from "@neondatabase/neon-js/auth/react/adapters";

const authUrl = process.env.NEXT_PUBLIC_NEON_AUTH_URL;
const dataApiUrl = process.env.NEXT_PUBLIC_NEON_DATA_API_URL;

if (!authUrl || !dataApiUrl) {
  throw new Error(
    "NEXT_PUBLIC_NEON_AUTH_URL and NEXT_PUBLIC_NEON_DATA_API_URL must be set. Copy .env.example to .env.local and fill them in.",
  );
}

/**
 * Browser client: signs in/out against Neon Auth and reads `contacts`
 * directly from the Data API. RLS (db/schema.sql) is what actually scopes
 * every row to its owner — this client has no elevated access.
 */
export const neon = createClient({
  auth: {
    url: authUrl,
    adapter: BetterAuthReactAdapter(),
  },
  dataApi: {
    url: dataApiUrl,
  },
});

/**
 * The SDK also exposes a `getJWTToken()` helper, but under the React adapter
 * it consistently 404s with `user_not_found` (verified against a live Neon
 * project — its internal Better Auth instance isn't the same
 * cookie-authenticated one `getSession()`/`useSession()` use). `getSession()`
 * is unaffected: Neon injects the session JWT into `session.token` via the
 * `set-auth-jwt` response header on every auth request, so this reads the
 * same token the SDK's own Data API calls already forward — just via the
 * method that actually works.
 */
export async function getAuthToken(): Promise<string | null> {
  const session = await neon.auth.getSession();
  return session.data?.session?.token ?? null;
}
