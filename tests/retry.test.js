import { describe, it, expect, vi } from "vitest";
import { getWithRetry } from "../src/lib/http.js";
const globalAny = global;
describe("getWithRetry", () => {
    it("retries on 429 and then succeeds", async () => {
        const responses = [
            { ok: false, status: 429, statusText: "Too Many", headers: new Headers(), text: async () => "rate" },
            { ok: true, status: 200, statusText: "OK", headers: new Headers({ "content-type": "application/json" }), text: async () => JSON.stringify({ ok: true }) }
        ];
        let i = 0;
        globalAny.fetch = vi.fn(async () => responses[i++]);
        const res = await getWithRetry("/test");
        expect(res.ok).toBe(true);
        expect(i).toBe(2);
    });
    it("does not retry on 400", async () => {
        globalAny.fetch = vi.fn(async () => ({
            ok: false,
            status: 400,
            statusText: "Bad",
            headers: new Headers(),
            text: async () => "bad"
        }));
        await expect(getWithRetry("/bad")).rejects.toBeTruthy();
    });
});
//# sourceMappingURL=retry.test.js.map