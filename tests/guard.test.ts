import { describe, it, expect, vi, afterEach } from "vitest";
import { allowDestructive } from "../src/lib/guard.ts";
import { postAction, hx } from "../src/lib/http.ts";

const globalAny = global as any;

describe("allowDestructive gate", () => {
  it("denies by default when ALLOW_DESTRUCTIVE is unset", () => {
    const r = allowDestructive("YES", false, {});
    expect(r.allowed).toBe(false);
    expect(r.reason).toMatch(/disabled/);
  });

  it("denies when enabled but the call is not confirmed", () => {
    expect(allowDestructive(undefined, false, { ALLOW_DESTRUCTIVE: "true" }).allowed).toBe(false);
    expect(allowDestructive("yes", false, { ALLOW_DESTRUCTIVE: "true" }).allowed).toBe(false);
  });

  it("only exact string 'true' enables destructive ops", () => {
    for (const v of ["1", "TRUE", "yes", " true"]) {
      expect(allowDestructive("YES", false, { ALLOW_DESTRUCTIVE: v }).allowed).toBe(false);
    }
  });

  it("allows when enabled and confirmed", () => {
    expect(allowDestructive("YES", false, { ALLOW_DESTRUCTIVE: "true" }).allowed).toBe(true);
  });

  it("dry run is always allowed because it never mutates", () => {
    expect(allowDestructive(undefined, true, {}).allowed).toBe(true);
  });
});

describe("unsafe mutations are never retried", () => {
  afterEach(() => vi.restoreAllMocks());

  it("POST that returns 429 is attempted exactly once and surfaces the error", async () => {
    const fetchMock = vi.fn(async () => ({
      ok: false,
      status: 429,
      statusText: "Too Many Requests",
      headers: new Headers(),
      text: async () => "rate limited"
    }));
    globalAny.fetch = fetchMock;
    await expect(postAction("deploy", "/x", { a: 1 })).rejects.toMatchObject({ status: 429 });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("DELETE that returns 503 is attempted exactly once", async () => {
    const fetchMock = vi.fn(async () => ({
      ok: false,
      status: 503,
      statusText: "Unavailable",
      headers: new Headers(),
      text: async () => ""
    }));
    globalAny.fetch = fetchMock;
    await expect(hx("/x", { method: "DELETE" })).rejects.toMatchObject({ status: 503 });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
