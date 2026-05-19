import { describe, expect, it } from "vitest";
import {
  DOCUMENT_REQUEST_STATUS_VALUES,
  LUPON_CASE_STATUS_VALUES,
  RESIDENT_STATUS_VALUES,
  isAllowedValue
} from "./statusValues.js";

describe("status value allowlists", () => {
  it("allows only resident clearance status colors used by the schema", () => {
    expect(RESIDENT_STATUS_VALUES).toEqual(["green", "yellow", "red"]);
    expect(isAllowedValue("green", RESIDENT_STATUS_VALUES)).toBe(true);
    expect(isAllowedValue("blue", RESIDENT_STATUS_VALUES)).toBe(false);
  });

  it("allows only database document request workflow statuses", () => {
    expect(DOCUMENT_REQUEST_STATUS_VALUES).toEqual([
      "pending",
      "processing",
      "released",
      "cancelled",
      "expired"
    ]);
    expect(isAllowedValue("released", DOCUMENT_REQUEST_STATUS_VALUES)).toBe(true);
    expect(isAllowedValue("on_hold", DOCUMENT_REQUEST_STATUS_VALUES)).toBe(false);
  });

  it("allows only database Lupon case statuses", () => {
    expect(LUPON_CASE_STATUS_VALUES).toEqual([
      "open",
      "under_mediation",
      "resolved",
      "dismissed",
      "referred"
    ]);
    expect(isAllowedValue("under_mediation", LUPON_CASE_STATUS_VALUES)).toBe(true);
    expect(isAllowedValue("pending", LUPON_CASE_STATUS_VALUES)).toBe(false);
  });
});
