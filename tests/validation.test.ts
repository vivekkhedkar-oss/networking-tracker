import { describe, expect, it } from "vitest";
import {
  contactInputSchema,
  contactUpdateSchema,
  stripOwnerFields,
} from "@/lib/validation";

const valid = {
  name: "Ada Lovelace",
  company: "Analytical Engines Inc",
  role: "Mathematician",
  where_met: "CS 61A office hours",
  notes: "Follow up about the internship.",
  priority: "high" as const,
};

describe("contactInputSchema — name", () => {
  it("rejects an empty name", () => {
    const result = contactInputSchema.safeParse({ ...valid, name: "" });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.message).toBe("Name is required.");
  });

  it("rejects a whitespace-only name", () => {
    const result = contactInputSchema.safeParse({ ...valid, name: "   " });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.message).toBe("Name is required.");
  });

  it("rejects a name longer than 120 characters", () => {
    const result = contactInputSchema.safeParse({
      ...valid,
      name: "a".repeat(121),
    });
    expect(result.success).toBe(false);
  });

  it("trims surrounding whitespace from a valid name", () => {
    const result = contactInputSchema.safeParse({
      ...valid,
      name: "  Ada Lovelace  ",
    });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.name).toBe("Ada Lovelace");
  });
});

describe("contactInputSchema — priority", () => {
  it("rejects a priority outside high/medium/low", () => {
    const result = contactInputSchema.safeParse({
      ...valid,
      priority: "urgent",
    });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.message).toBe(
      "Priority must be high, medium, or low.",
    );
  });

  it.each(["high", "medium", "low"] as const)(
    "accepts priority %s",
    (priority) => {
      const result = contactInputSchema.safeParse({ ...valid, priority });
      expect(result.success).toBe(true);
    },
  );
});

describe("contactInputSchema — optional fields", () => {
  it("normalizes empty optional strings to null", () => {
    const result = contactInputSchema.safeParse({
      ...valid,
      company: "",
      role: "   ",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.company).toBeNull();
      expect(result.data.role).toBeNull();
    }
  });

  it("rejects notes longer than 2000 characters", () => {
    const result = contactInputSchema.safeParse({
      ...valid,
      notes: "a".repeat(2001),
    });
    expect(result.success).toBe(false);
  });

  it("accepts a fully valid payload unchanged", () => {
    const result = contactInputSchema.safeParse(valid);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toMatchObject(valid);
    }
  });

  it("rejects unknown fields", () => {
    const result = contactInputSchema.safeParse({
      ...valid,
      is_admin: true,
    });
    expect(result.success).toBe(false);
  });
});

describe("contactUpdateSchema", () => {
  it("rejects an update with no fields", () => {
    const result = contactUpdateSchema.safeParse({});
    expect(result.success).toBe(false);
  });

  it("accepts a partial update", () => {
    const result = contactUpdateSchema.safeParse({ priority: "low" });
    expect(result.success).toBe(true);
  });
});

describe("stripOwnerFields", () => {
  it("removes user_id and id so a caller can never propose an owner", () => {
    const stripped = stripOwnerFields({
      ...valid,
      id: "some-other-id",
      user_id: "someone-elses-id",
    });
    expect(stripped).not.toHaveProperty("user_id");
    expect(stripped).not.toHaveProperty("id");
    expect(stripped.name).toBe(valid.name);
  });
});
