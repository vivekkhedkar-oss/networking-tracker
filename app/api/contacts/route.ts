import { NextResponse } from "next/server";
import {
  contactInputSchema,
  stripOwnerFields,
} from "@/lib/validation";
import { createServerDataClient, extractBearerToken } from "@/lib/server-data-api";
import type { Contact } from "@/lib/types";

/**
 * Creates a contact for the signed-in caller.
 *
 * This route re-validates on the server (never trust the browser), then
 * forwards the caller's own JWT to the Data API. It never sets `user_id`
 * itself — the column default `auth.user_id()` and the INSERT RLS policy do
 * that, so there is no code path here that could assign a row to someone
 * else.
 */
export async function POST(request: Request) {
  const token = extractBearerToken(request);
  if (!token) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  if (typeof body !== "object" || body === null) {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const parsed = contactInputSchema.safeParse(stripOwnerFields(body as Record<string, unknown>));
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid contact data." },
      { status: 400 },
    );
  }

  const client = createServerDataClient(token);
  const { data, error } = await client
    .from("contacts")
    .insert(parsed.data)
    .select()
    .single<Contact>();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ contact: data }, { status: 201 });
}
