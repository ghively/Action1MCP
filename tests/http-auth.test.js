import { describe, it, expect, vi } from "vitest";
import { hx } from "../src/lib/http.js";
const globalAny = global;
describe("http auth headers", () => {
    it("sets Bearer token when provided", async () => {
        process.env.BEARER_TOKEN = "test-token";
        let capturedAuth = "";
        globalAny.fetch = vi.fn(async (url, init) => {
            const h = new Headers(init.headers);
            capturedAuth = h.get("Authorization") || "";
            return { ok: true, status: 200, statusText: "OK", headers: new Headers({ "content-type": "application/json" }), text: async () => "{}" };
        });
        await hx("/ping");
        expect(capturedAuth).toBe("Bearer test-token");
    });
});
//# sourceMappingURL=http-auth.test.js.map