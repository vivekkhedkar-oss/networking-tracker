import { createClient } from "@neondatabase/neon-js";

const dataApiUrl: string = (() => {
  const url = process.env.NEXT_PUBLIC_NEON_DATA_API_URL;
  if (!url) throw new Error("NEXT_PUBLIC_NEON_DATA_API_URL must be set.");
  return url;
})();

export function extractBearerToken(request: Request): string | null {
  const header = request.headers.get("authorization");
  if (!header?.startsWith("Bearer ")) return null;
  const token = header.slice("Bearer ".length).trim();
  return token.length > 0 ? token : null;
}

/**
 * Server-side Data API client used by route handlers.
 *
 * This deliberately uses the "external auth provider" form of createClient
 * (no `auth` block): it forwards the caller's own JWT via `dataApi.getToken`
 * rather than authenticating as anyone itself. Postgres — via RLS policies
 * keyed on auth.user_id() — is what enforces that the caller can only touch
 * their own rows; this client has no elevated privileges and never uses
 * DATABASE_URL.
 */
export function createServerDataClient(token: string) {
  return createClient({
    dataApi: {
      url: dataApiUrl,
      getToken: async () => token,
    },
  });
}
