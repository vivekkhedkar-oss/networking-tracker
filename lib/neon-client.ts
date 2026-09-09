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
 * `getJWTToken` is implemented by every Neon auth adapter instance (it lives
 * on the shared `NeonAuthAdapterCore` base class) but is missing from the
 * public `NeonAuthPublicApi<T>` type that `neon.auth` is declared as — an
 * upstream type-export gap, not a runtime one. This is the one place that
 * assertion lives, so our own route handlers can forward the caller's JWT
 * (see lib/server-data-api.ts) without every call site needing to know why.
 */
type NeonAuthWithToken = {
  getJWTToken: (allowAnonymous?: boolean) => Promise<string | null>;
};

export function getAuthToken(): Promise<string | null> {
  return (neon.auth as unknown as NeonAuthWithToken).getJWTToken(false);
}
