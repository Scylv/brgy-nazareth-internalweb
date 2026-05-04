import { describe, expect, it } from "vitest";
import { canProceedWithClearance } from "./canProceedWithClearance";

describe("canProceedWithClearance", () => {
  it("returns true for green status", () => {
    expect(canProceedWithClearance("green")).toBe(true);
  });

  it("returns false for yellow and red statuses", () => {
    expect(canProceedWithClearance("yellow")).toBe(false);
    expect(canProceedWithClearance("red")).toBe(false);
  });

  it("returns false for invalid string values", () => {
    expect(canProceedWithClearance("blue")).toBe(false);
    expect(canProceedWithClearance("")).toBe(false);
    expect(canProceedWithClearance("GREEN")).toBe(false);
  });

  it("returns false for missing and non-string values", () => {
    expect(canProceedWithClearance()).toBe(false);
    expect(canProceedWithClearance(null)).toBe(false);
    expect(canProceedWithClearance(undefined)).toBe(false);
    expect(canProceedWithClearance(1)).toBe(false);
    expect(canProceedWithClearance({ status: "green" })).toBe(false);
  });
});
