import { describe, it, expect } from "vitest";
import { endpoints } from "../src/endpoints.js";

describe("endpoints map", () => {
  it("includes endpoints_status", () => {
    expect(endpoints.resources["endpoints_status"]).toBeTruthy();
  });
  it("includes deployer_installation_windows", () => {
    expect(endpoints.resources["deployer_installation_windows"]).toBeTruthy();
  });
  it("includes agent_installation with installType", () => {
    expect(endpoints.resources["agent_installation"]).toBeTruthy();
    const r = endpoints.resources["agent_installation"]?.get;
    expect(r?.path).toContain("{installType}");
  });
  it("includes remoteSessions subresource for endpoints", () => {
    const sub = endpoints.resources["endpoints"].subresources?.["remoteSessions"];
    expect(sub?.get).toBeTruthy();
    expect(sub?.update).toBeTruthy();
  });
});

