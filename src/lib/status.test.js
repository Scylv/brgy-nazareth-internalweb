import { describe, expect, it } from "vitest";
import { getStatusAction } from "./status";

describe("getStatusAction", () => {
  it("returns proceed for green status", () => {
    expect(getStatusAction("green")).toBe("Proceed with clearance");
  });

  it("returns Lupon referral for yellow and red statuses", () => {
    expect(getStatusAction("yellow")).toBe("Refer to Lupon office");
    expect(getStatusAction("red")).toBe("Refer to Lupon office");
  });
});
