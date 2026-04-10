import { describe, expect, it } from "vitest";
import { canEditRecord } from "./permissions";

describe("canEditRecord", () => {
  it("allows Lupon staff to edit", () => {
    expect(canEditRecord("lupon")).toBe(true);
  });

  it("blocks Department Office and Admin from editing resident records", () => {
    expect(canEditRecord("department")).toBe(false);
    expect(canEditRecord("admin")).toBe(false);
  });
});
