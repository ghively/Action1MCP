import { describe, it, expect } from "vitest";
import { interpolatePath } from "../src/endpoints.js";

describe("interpolatePath", () => {
  it("replaces placeholders with encoded values", () => {
    const out = interpolatePath("/x/{orgId}/y/{endpointId}", { orgId: "org 1", endpointId: "id/2" });
    expect(out).toBe("/x/org%201/y/id%2F2");
  });

  it("throws for missing params", () => {
    expect(() => interpolatePath("/x/{orgId}", {} as any)).toThrow(/Missing path param/);
  });
});

