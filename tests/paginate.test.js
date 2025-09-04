import { describe, it, expect, vi } from "vitest";
import { paginate } from "../src/lib/paginate.js";
import { endpoints } from "../src/endpoints.js";
const globalAny = global;
describe("paginate (cursor)", () => {
    it("iterates through cursors", async () => {
        endpoints.pagination.style = "cursor";
        const pages = [
            { items: [1, 2], next_page: "abc" },
            { items: [3], next_page: null }
        ];
        let i = 0;
        globalAny.fetch = vi.fn(async () => ({
            ok: true,
            status: 200,
            statusText: "OK",
            headers: new Headers({ "content-type": "application/json" }),
            text: async () => JSON.stringify(pages[i++])
        }));
        const got = [];
        for await (const chunk of paginate("/things", { limit: 2 })) {
            got.push(...chunk);
        }
        expect(got).toEqual([1, 2, 3]);
    });
});
//# sourceMappingURL=paginate.test.js.map