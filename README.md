# Networking Tracker

A private contact tracker for the people you want to stay connected with — add a name, company, role, where you met, notes, and a priority, then sort and filter your list. Every row is scoped to its owner by Postgres Row Level Security, not just application code, so even a fully public database API can't leak one user's contacts to another.

**Live app:** [networking-tracker-orpin.vercel.app](https://networking-tracker-orpin.vercel.app)

**Stack:** Next.js 16 · React 19 · TypeScript · Tailwind CSS + shadcn/ui · Neon Postgres (Row Level Security) · Neon Auth · Zod · Vitest · Vercel

## Product walkthrough

The flow is: sign up → land on `/contacts` (empty state) → **Add contact** opens a dialog for name, company, role, where you met, priority, and notes → the new row appears immediately in a sortable table (cards on mobile) → edit or delete via the row actions → sign out returns you to `/sign-in`.

Verified end-to-end against the live Neon project (not mocked) in this session:
- Sign-up, sign-out, sign-in as a real account (`test-a@example.com`)
- Create, edit, delete a contact; the list re-fetches from Postgres after each mutation
- A hard refresh (and a fresh page load on the deployed URL) still shows the contact — proving it's reading from Postgres, not local state
- Submitting an empty name shows an inline `Name is required.` error and sends no request
- A forged request with `priority: "urgent"` (bypassing the UI entirely, sent straight to `/api/contacts`) is rejected server-side with `400 { "error": "Priority must be high, medium, or low." }`
- The two-account isolation proof below, run against the live database

## Features

- Email/password sign-up, sign-in, and sign-out (Neon Managed Better Auth)
- Private per-user contact list: create, view, edit, delete
- Sort by name, company, priority, or date added (either direction)
- Filter by priority and free-text search across name/company/role
- Contacts persist in Postgres — survive a full browser refresh
- Server-side validation independent of the browser (required name, `priority` restricted to `high` | `medium` | `low`)
- Loading, empty, error, and success states throughout
- Responsive layout: a table on wider screens, cards on mobile
- Row Level Security with four explicit ownership policies (select/insert/update/delete)

## Technology stack

| Layer | Choice | Why |
|---|---|---|
| Frontend | Next.js 16 (App Router) + React 19 | One deploy target for UI and API routes, native to Vercel |
| Styling / components | Tailwind CSS v4 + shadcn/ui (`base-nova` preset, Base UI primitives) | Accessible, unstyled primitives with full control over markup — no black-box components |
| Backend | Next.js Route Handlers (`app/api/**`) | A real server boundary for write validation, separate from the browser client |
| Database | Neon Postgres | Managed Postgres with branching, generous free tier |
| Auth | Neon Managed Better Auth | Issues JWTs Postgres can verify directly via `auth.user_id()`, no separate auth server to run |
| Data access | Neon Data API (PostgREST) via `@neondatabase/neon-js` | Lets the browser query Postgres directly under RLS, without a hand-rolled REST layer for reads |
| Validation | Zod | One schema shared by the client form and the server route handlers |
| Testing | Vitest | Fast, native ESM, no config beyond `vitest.config.ts` |
| Hosting | Vercel | Zero-config Next.js deploys, environment variable management |

## Architecture

```
                    ┌──────────────────────────────────────────┐
  Browser           │  Next.js App Router (Vercel)              │
  ─────────         │                                            │
  React client ─────┼─► /sign-in, /sign-up   (custom forms)      │
  components        │      neon.auth.signIn.email(...)           │
                     │                                            │
  READ  ────────────┼────────────────────────────────────────────┼──► Neon Data API
  neon.from('contacts').select()  (JWT auto-attached)             │    (PostgREST)
                     │                                            │        │
  WRITE ────────────┼─► app/api/contacts          (POST)          │        │ RLS
  fetch(..., Bearer  │   app/api/contacts/[id]     (PATCH, DELETE) │        ▼
   <jwt>)            │      1. parse + validate (shared Zod)       │  Neon Postgres
                     │      2. createServerDataClient(token)       │  contacts table
                     │      3. forward the caller's own JWT ───────┼───────►│
                     └──────────────────────────────────────────┘   4 RLS policies
```

**The security boundary is Row Level Security, not the route handler.** `app/api/contacts/**` re-validates input (never trust the browser) but never authenticates as anyone and never touches `DATABASE_URL`. It forwards the *caller's own* JWT to the Data API via `lib/server-data-api.ts`, so Postgres — not application code — decides which rows that caller may read, insert, update, or delete. This is what makes it safe that `NEXT_PUBLIC_NEON_DATA_API_URL` is public: without the matching RLS policies, exposing that URL would let anyone query any row; with them, every request is scoped by `auth.user_id()` no matter who calls it.

`DATABASE_URL` is used exactly once, by a human running [`db/schema.sql`](db/schema.sql) in the Neon SQL editor. It is never read by application code and is not present in this repository.

## Local setup

1. **Clone and install**
   ```bash
   git clone <this-repo-url>
   cd networking-tracker
   npm install
   ```
2. **Create a Neon project** at [neon.tech](https://neon.tech), then in the project:
   - Enable **Managed Better Auth**.
   - Enable the **Data API** for the `neondb` database (grant public schema access).
   - Under Managed Better Auth → trusted domains, add `http://localhost:3000`.
   - Copy the generated Auth URL and Data API URL.
3. **Run the schema.** Open the Neon SQL editor and run [`db/schema.sql`](db/schema.sql). This creates the `contacts` table, enables RLS, and creates all four ownership policies.
4. **Configure environment variables**
   ```bash
   cp .env.example .env.local
   ```
   Fill in `NEXT_PUBLIC_NEON_AUTH_URL` and `NEXT_PUBLIC_NEON_DATA_API_URL` from step 2. `DATABASE_URL` is only needed locally if you want to re-run schema changes from a SQL client instead of the Neon console; it is never read by the app itself.
5. **Run it**
   ```bash
   npm run dev
   ```
   Open [http://localhost:3000](http://localhost:3000), sign up, and start adding contacts.

Steps 2–4 can also be done with the [Neon CLI](https://neon.com/docs/reference/cli): `neon link --project-id <id> --branch <branch>` pulls `DATABASE_URL` into `.env.local`, and [`neon.ts`](neon.ts) declares `auth: true` / `dataApi: true` so `neon config apply` provisions both services — `neon neon-auth domain allow-localhost enable` replaces the manual trusted-domain step for local dev. This is how this project's own Neon backend was actually provisioned.

## Environment variables

See [`.env.example`](.env.example) for the full list with placeholder values. Summary:

| Variable | Exposure | Used for |
|---|---|---|
| `NEXT_PUBLIC_NEON_AUTH_URL` | Public | Browser auth client (sign up/in/out, session) |
| `NEXT_PUBLIC_NEON_DATA_API_URL` | Public | Browser reads, and server-side writes forwarding the caller's JWT |
| `DATABASE_URL` | Server-only | Not read by app code — used only to run `db/schema.sql` once, by hand |
| `NEON_AUTH_BASE_URL` / `NEON_AUTH_COOKIE_SECRET` | Server-only | Not used by this implementation (see *Known limitations*) — declared for compatibility with Neon's cookie-session Next.js integration path, in case that's adopted later |

The Auth and Data API URLs are safe to expose publicly: they are meaningless without a valid session, and every row they can touch is still gated by the RLS policies below.

## Database schema

`contacts` table ([`db/schema.sql`](db/schema.sql)):

| Column | Type | Notes |
|---|---|---|
| `id` | `uuid` | Primary key, `gen_random_uuid()` |
| `user_id` | `text` | **Not null**, defaults to `auth.user_id()` — the owning user, taken from the JWT, never from client input |
| `name` | `text` | Not null; `CHECK` constraints reject blank or >120-char names |
| `company` | `text` | Nullable |
| `role` | `text` | Nullable |
| `where_met` | `text` | Nullable |
| `notes` | `text` | Nullable |
| `priority` | `text` | Not null, default `'medium'`; `CHECK (priority in ('high','medium','low'))` |
| `created_at` / `updated_at` | `timestamptz` | Defaulted / trigger-maintained |

## Authentication and Row Level Security

- Sign-up/sign-in/sign-out go through Neon Managed Better Auth (`@neondatabase/neon-js`, `client.auth.signUp.email` / `signIn.email` / `signOut`). Better Auth issues a JWT whose `sub` claim is the user's id.
- **Every** access to `contacts` — from the browser directly, or via this app's own `/api/contacts` routes — goes through the Neon Data API, which validates that JWT and makes `auth.user_id()` available to Postgres.
- Row Level Security is enabled and **forced** on `contacts`, with four separate, explicitly named policies (not one blanket `FOR ALL`):
  - `contacts_select_own` — `USING (auth.user_id() = user_id)`
  - `contacts_insert_own` — `WITH CHECK (auth.user_id() = user_id)`
  - `contacts_update_own` — `USING (auth.user_id() = user_id) WITH CHECK (auth.user_id() = user_id)`
  - `contacts_delete_own` — `USING (auth.user_id() = user_id)`
- The **`USING`** clause on the update policy limits which existing rows an `UPDATE` may even target (must already be yours). The **`WITH CHECK`** clause independently limits what the row is allowed to look like *after* the update — this is the specific mechanism that stops a user from re-assigning one of their own rows to someone else's `user_id`.
- The app-level validation in `lib/validation.ts` and the route handlers in `app/api/contacts/**` are a UX and defense-in-depth layer, not the security boundary: they never set `user_id` and explicitly strip it from any client-supplied body (`stripOwnerFields`) before ever forwarding a request.
- **Two-account isolation proof.** [`db/rls-proof.sql`](db/rls-proof.sql) is a database-level proof, independent of the app — run it in the Neon SQL editor. It was also run against the live project: `A sees only own rows`, `A cannot update B row`, `A cannot delete B row`, and the reassignment attempt is blocked by Postgres itself (`insufficient_privilege`, SQLSTATE `42501`) rather than merely filtered — all pass.

  The stronger, app-level proof (below) attacks the real deployed system as one signed-in user targeting another's data, through three different paths at once.

## Evidence

All of the following was run against the live Neon project (production database, not a mock), using two real accounts created through the app's own sign-up form: `test-a@example.com` ("Test User A") and `test-b@example.com` ("Test User B").

**Two-account isolation.** User A created a contact ("Ada Lovelace"). Signed in as User B, three separate attacks were made against that row's real UUID, plus one attempt to reassign B's own row to A:

| Attack (as User B) | Path | Result |
|---|---|---|
| Read A's contact | Direct Data API `GET /contacts?id=eq.<ada-id>` | `200`, `[]` — row invisible |
| Overwrite A's contact | Direct Data API `PATCH /contacts?id=eq.<ada-id>` | `200`, `[]` — 0 rows affected |
| Delete A's contact | Direct Data API `DELETE /contacts?id=eq.<ada-id>` | `200`, `[]` — 0 rows affected |
| Overwrite A's contact | This app's own `PATCH /api/contacts/<ada-id>` | `404 { "error": "Contact not found." }` |
| Delete A's contact | This app's own `DELETE /api/contacts/<ada-id>` | `404 { "error": "Contact not found." }` |
| Reassign B's own row to belong to A (`user_id: <a-id>`) | Direct Data API `PATCH /contacts?id=eq.<b-contact-id>` | `403`, `{ "code": "42501", "message": "new row violates row-level security policy for table \"contacts\"" }` |

The last row is the `WITH CHECK` clause on `contacts_update_own` firing by name — B cannot even give their own contact away, let alone take someone else's. The route-handler attempts return 404 rather than 403/401 so a caller can't distinguish "not yours" from "doesn't exist."

The mirror direction (A attacking B's data) is not separately re-run: the RLS policies are symmetric and identical for every `authenticated` caller, so what blocks B here blocks any other authenticated user identically — the attacks above exercise every write and read path the app or a hostile client could use.

**Invalid input fails safely.**
- Client-side: submitting the contact form with an empty `Name` shows a red-bordered field and the inline message `Name is required.` beneath it, without sending a request.
- Server-side, bypassing the UI: `POST /api/contacts` with `{"name": "Ada Lovelace", "priority": "urgent"}` and a valid session token returns `400 { "error": "Priority must be high, medium, or low." }`.

**Automated tests.** See the *Testing* section below — 20/20 passing, including tests that specifically assert the server rejects invalid input before ever calling the Data API.

**No secrets committed.** `git log -p` on this repository contains no `DATABASE_URL`, connection string, or cookie secret; `.env.local` was never tracked (only `.env.example`, with placeholder values, is committed).

## Testing

```bash
npm test
```

Runs the Vitest suite (`tests/validation.test.ts`, `tests/api-contacts.test.ts` — no database required, the Data API client is mocked). Last local run:

```
 Test Files  2 passed (2)
      Tests  20 passed (20)
```

What's covered:
- `contactInputSchema` rejects an empty name, a whitespace-only name, and a name over 120 characters, each with the exact user-facing message.
- `priority` is restricted to `high` | `medium` | `low`; anything else (e.g. `"urgent"`) is rejected with a clear message.
- Optional fields normalize empty strings to `null`; unknown fields are rejected.
- `POST /api/contacts` returns **401** with no `Authorization` header and never calls the Data API.
- `POST /api/contacts` returns **400** for an empty name or invalid priority, again without ever calling the Data API — proving the server enforces validation independently of the browser.
- A client-supplied `user_id` is stripped before the insert ever reaches the Data API.

## Deployment

This project is deployed at **[networking-tracker-orpin.vercel.app](https://networking-tracker-orpin.vercel.app)**. To deploy your own copy:

1. Push the repository to GitHub.
2. `vercel link` in the project directory (or import the repo from the Vercel dashboard).
3. Add `NEXT_PUBLIC_NEON_AUTH_URL` and `NEXT_PUBLIC_NEON_DATA_API_URL` as production environment variables — Vercel will flag them as "looks like a credential" because of the `NEXT_PUBLIC_` prefix; that's expected, confirm them as public config (`--type config` on the CLI, or "Config" if prompted in the dashboard). They're safe to expose: see *Architecture* above.
4. `vercel --prod` to deploy.
5. Add the deployed domain to Managed Better Auth's trusted origins (Neon console, or `neon neon-auth domain add <url>` with the CLI).
6. Open the deployed URL in a private browser window and verify sign-up, sign-in, and CRUD work end-to-end.

Connecting the GitHub repo to Vercel for automatic deploys on push (`vercel git connect` or the dashboard's Git integration) requires authorizing Vercel's GitHub App separately — a one-time browser step on Vercel's side, independent of the deploy itself.

## Known limitations and next steps

- No password reset flow — email/password sign-up and sign-in only.
- No OAuth providers, though Better Auth supports them and the SDK exposes `signIn.social`.
- Search and priority filtering happen client-side after fetching all of a user's contacts; fine at personal-contact-list scale, but would move server-side (via Data API filters) if lists grew large.
- No pagination — same scale assumption as above.
- No contact avatars/photos.
- The Next.js integration path that uses `NEON_AUTH_BASE_URL`/`NEON_AUTH_COOKIE_SECRET` (cookie-based sessions, server components) was considered but not used — this app uses the browser-direct Neon Auth client instead, which keeps the write path's JWT-forwarding straightforward. Both are legitimate; a server-rendered protected-route model would be the natural next iteration.
- `@neondatabase/neon-js` is a beta package (`0.7.0-beta`, pinned). Its `getJWTToken()` helper 404s (`user_not_found`) under the React adapter in this version — verified against the live project, not a guess. `lib/neon-client.ts` reads the same token via `getSession()` instead (Neon injects it into `session.token` via the `set-auth-jwt` response header on every auth request), which works reliably and needs no SDK internals. Worth revisiting if a future SDK release fixes `getJWTToken()` directly.
- No screenshots are embedded in this README — the evidence above documents exact requests, status codes, and error bodies from testing against the live deployment instead. Open the [live app](https://networking-tracker-orpin.vercel.app) directly to see it running.
