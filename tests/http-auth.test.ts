import { describe, it, expect, vi } from "vitest";
import { hx } from "../src/lib/http.ts";

const globalAny = global as any;

describe("http auth headers", () => {
  it("sets Bearer token when provided", async () => {
    process.env.BEARER_TOKEN = "test-token";
    let capturedAuth = "";
    globalAny.fetch = vi.fn(async (url: string, init: any) => {
      const h = new Headers(init.headers);
      capturedAuth = h.get("Authorization") || "";
      return { ok: true, status: 200, statusText: "OK", headers: new Headers({ "content-type": "application/json" }), text: async () => "{}" } as any;
    });
    await hx("/ping");
    expect(capturedAuth).toBe("Bearer test-token");
  });
});
