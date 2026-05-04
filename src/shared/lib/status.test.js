import { describe, expect, it } from "vitest";
import { getStatusAction, getStatusMeta } from "./status";

describe("getStatusAction", () => {
  it("returns proceed for green status", () => {
    expect(getStatusAction("green")).toBe("Proceed with clearance");
  });

  it("returns Lupon referral for yellow and red statuses", () => {
    expect(getStatusAction("yellow")).toBe("Refer to Lupon office");
    expect(getStatusAction("red")).toBe("Refer to Lupon office");
  });

  it("falls back to the red status action for unknown statuses", () => {
    expect(getStatusAction("blue")).toBe("Refer to Lupon office");
  });
});

describe("getStatusMeta", () => {
  it("falls back to red metadata for unknown statuses", () => {
    expect(getStatusMeta("blue")).toMatchObject({
      label: "Red",
      summary: "Refer to Lupon",
      action: "Refer to Lupon office"
    });
  });
});
