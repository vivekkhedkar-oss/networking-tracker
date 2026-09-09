import { describe, expect, it, vi, beforeEach } from "vitest";

const insertMock = vi.fn();
const createServerDataClientMock = vi.fn();

vi.mock("@/lib/server-data-api", async () => {
  const actual = await vi.importActual<
    typeof import("@/lib/server-data-api")
  >("@/lib/server-data-api");
  return {
    ...actual,
    createServerDataClient: (...args: unknown[]) =>
      createServerDataClientMock(...args),
  };
});

// server-data-api throws at import time if this isn't set — the tests never
// hit a real Data API (the client factory itself is mocked above), but the
// module-level guard runs regardless.
process.env.NEXT_PUBLIC_NEON_DATA_API_URL ??= "https://example.invalid/rest/v1";

const { POST } = await import("@/app/api/contacts/route");

function jsonRequest(body: unknown, headers: Record<string, string> = {}) {
  return new Request("http://localhost/api/contacts", {
    method: "POST",
    headers: { "content-type": "application/json", ...headers },
    body: JSON.stringify(body),
  });
}

const AUTH_HEADER = { authorization: "Bearer test-jwt" };
const validPayload = { name: "Ada Lovelace", priority: "high" as const };

beforeEach(() => {
  insertMock.mockReset();
  createServerDataClientMock.mockReset();
  createServerDataClientMock.mockReturnValue({
    from: () => ({
      insert: insertMock.mockReturnValue({
        select: () => ({
          single: async () => ({
            data: { id: "new-id", ...validPayload },
            error: null,
          }),
        }),
      }),
    }),
  });
});

describe("POST /api/contacts — auth", () => {
  it("returns 401 with no Authorization header, and never touches the Data API", async () => {
    const res = await POST(jsonRequest(validPayload));
    expect(res.status).toBe(401);
    expect(createServerDataClientMock).not.toHaveBeenCalled();
  });
});

describe("POST /api/contacts — validation", () => {
  it("returns 400 for an empty name, and never touches the Data API", async () => {
    const res = await POST(
      jsonRequest({ ...validPayload, name: "" }, AUTH_HEADER),
    );
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("Name is required.");
    expect(createServerDataClientMock).not.toHaveBeenCalled();
  });

  it("returns 400 for an invalid priority, and never touches the Data API", async () => {
    const res = await POST(
      jsonRequest({ ...validPayload, priority: "urgent" }, AUTH_HEADER),
    );
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("Priority must be high, medium, or low.");
    expect(createServerDataClientMock).not.toHaveBeenCalled();
  });

  it("strips a caller-supplied user_id before it ever reaches the Data API", async () => {
    const res = await POST(
      jsonRequest(
        { ...validPayload, user_id: "someone-elses-id" },
        AUTH_HEADER,
      ),
    );
    expect(res.status).toBe(201);
    expect(insertMock).toHaveBeenCalledTimes(1);
    const insertedRow = insertMock.mock.calls[0][0];
    expect(insertedRow).not.toHaveProperty("user_id");
  });

  it("accepts a valid payload and forwards the caller's token", async () => {
    const res = await POST(jsonRequest(validPayload, AUTH_HEADER));
    expect(res.status).toBe(201);
    expect(createServerDataClientMock).toHaveBeenCalledWith("test-jwt");
  });
});
