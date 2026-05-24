import { describe, expect, it } from "vitest";
import { getStatusAction, getStatusMeta } from "./status";

describe("getStatusAction", () => {
  it("returns proceed for green status", () => {
    expect(getStatusAction("green")).toBe("Cleared - proceed");
  });

  it("returns Lupon referral for yellow and red statuses", () => {
    expect(getStatusAction("yellow")).toBe("Needs Lupon review");
    expect(getStatusAction("red")).toBe("Hold - Lupon required");
  });

  it("falls back to the red status action for unknown statuses", () => {
    expect(getStatusAction("blue")).toBe("Hold - Lupon required");
  });
});

describe("getStatusMeta", () => {
  it("falls back to red metadata for unknown statuses", () => {
    expect(getStatusMeta("blue")).toMatchObject({
      label: "Red",
      summary: "Hold - Lupon required",
      action: "Hold - Lupon required"
    });
  });
});
