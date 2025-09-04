import { describe, it, expect } from "vitest";
import { qs } from "../src/lib/qs.js";
describe("qs", () => {
    it("skips undefined/null/empty", () => {
        const out = qs({ a: 1, b: undefined, c: null, d: "", e: "x" });
        expect(out).toBe("?a=1&e=x");
    });
    it("serializes arrays and objects", () => {
        const out = qs({ a: ["x", "y"], f: { g: 1 } });
        expect(out).toContain("a=x");
        expect(out).toContain("a=y");
        expect(out).toContain("f=%7B%22g%22%3A1%7D");
    });
});
//# sourceMappingURL=qs.test.js.map