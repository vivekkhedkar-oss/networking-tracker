import { NextResponse } from "next/server";
import {
  contactUpdateSchema,
  stripOwnerFields,
} from "@/lib/validation";
import { createServerDataClient, extractBearerToken } from "@/lib/server-data-api";
import type { Contact } from "@/lib/types";

/**
 * Updates a contact owned by the signed-in caller.
 *
 * The UPDATE RLS policy's `USING` clause means the WHERE below can only ever
 * match a row the caller owns — attempting to edit someone else's row
 * returns 0 rows affected here, which we report as 404 rather than leaking
 * that the row exists. The `WITH CHECK` clause (see db/schema.sql) further
 * guarantees the row cannot come out of the update belonging to anyone else,
 * even though this handler never accepts a user_id in the first place.
 */
export async function PATCH(
  request: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const token = extractBearerToken(request);
  if (!token) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const { id } = await ctx.params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  if (typeof body !== "object" || body === null) {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const parsed = contactUpdateSchema.safeParse(stripOwnerFields(body as Record<string, unknown>));
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid contact data." },
      { status: 400 },
    );
  }

  const client = createServerDataClient(token);
  const { data, error } = await client
    .from("contacts")
    .update(parsed.data)
    .eq("id", id)
    .select()
    .maybeSingle<Contact>();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  if (!data) {
    return NextResponse.json({ error: "Contact not found." }, { status: 404 });
  }

  return NextResponse.json({ contact: data });
}

export async function DELETE(
  request: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const token = extractBearerToken(request);
  if (!token) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const { id } = await ctx.params;

  const client = createServerDataClient(token);
  const { data, error } = await client
    .from("contacts")
    .delete()
    .eq("id", id)
    .select()
    .maybeSingle<Contact>();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  if (!data) {
    return NextResponse.json({ error: "Contact not found." }, { status: 404 });
  }

  return NextResponse.json({ contact: data });
}
