import { z } from "zod";

export const PRIORITIES = ["high", "medium", "low"] as const;

const optionalText = (max: number) =>
  z
    .string()
    .max(max, `Must be ${max} characters or fewer.`)
    .optional()
    .nullable()
    .transform((value) => {
      const trimmed = value?.trim();
      return trimmed ? trimmed : null;
    });

/**
 * Shared by the client form and the server route handlers so the two can't
 * drift. Postgres CHECK constraints (db/schema.sql) are the final authority;
 * this schema exists to give users a clear message before that.
 */
export const contactInputSchema = z
  .object({
    name: z
      .string({ error: "Name is required." })
      .trim()
      .min(1, "Name is required.")
      .max(120, "Name must be 120 characters or fewer."),
    company: optionalText(120),
    role: optionalText(120),
    where_met: optionalText(120),
    notes: optionalText(2000),
    priority: z.enum(PRIORITIES, {
      error: "Priority must be high, medium, or low.",
    }),
  })
  .strict();

export type ContactInput = z.infer<typeof contactInputSchema>;

export const contactUpdateSchema = contactInputSchema.partial().refine(
  (value) => Object.keys(value).length > 0,
  { message: "No fields provided to update." },
);

export type ContactUpdateInput = z.infer<typeof contactUpdateSchema>;

/**
 * A caller must never be able to propose an owner for a row — user_id is
 * always taken from the authenticated JWT (auth.user_id() at insert time,
 * the WHERE clause at update/delete time). Strip it (and id) defensively in
 * case a client sends it anyway.
 */
export function stripOwnerFields<T extends Record<string, unknown>>(
  body: T,
): Omit<T, "user_id" | "id"> {
  const rest: Record<string, unknown> = { ...body };
  delete rest.user_id;
  delete rest.id;
  return rest as Omit<T, "user_id" | "id">;
}
