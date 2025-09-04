import { describe, it, expect, vi } from "vitest";
import { resolveToIds } from "../src/lib/resolve.js";
import { endpoints } from "../src/endpoints.js";
const globalAny = global;
describe("resolveToIds", () => {
    it("filters by names", async () => {
        const list = { items: [{ id: "1", name: "Alpha" }, { id: "2", name: "Beta" }] };
        endpoints.resources["devices_test"] = { list: { path: "/devices/{orgId}", method: "GET" } };
        globalAny.fetch = vi.fn(async () => ({
            ok: true,
            status: 200,
            statusText: "OK",
            headers: new Headers({ "content-type": "application/json" }),
            text: async () => JSON.stringify(list)
        }));
        const res = await resolveToIds({ resource: "devices_test", orgId: "org", names: ["alp"] });
        expect(res.map((r) => r.id)).toEqual(["1"]);
    });
});
//# sourceMappingURL=resolve.test.js.map