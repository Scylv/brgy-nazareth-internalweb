import { describe, expect, it } from "vitest";
import { residents } from "../../../data/residents";
import { validateResidentForm } from "./validateResidentForm";

describe("validateResidentForm", () => {
  it("accepts a valid resident record", () => {
    const result = validateResidentForm(residents[0]);
    expect(result.isValid).toBe(true);
    expect(result.errors).toEqual({});
  });

  it("returns validation errors for missing required fields", () => {
    const result = validateResidentForm({
      id: "",
      name: "",
      address: "",
      status: "unknown",
      documents: "not-an-array"
    });

    expect(result.isValid).toBe(false);
    expect(result.errors).toMatchObject({
      id: "Resident ID is required.",
      name: "Full name is required.",
      address: "Address is required.",
      status: "Status must be green, yellow, or red.",
      documents: "Documents must be a list."
    });
  });

  it("rejects whitespace-only required fields and missing documents", () => {
    const result = validateResidentForm({
      id: "   ",
      name: "   ",
      address: "   ",
      status: "green"
    });

    expect(result.isValid).toBe(false);
    expect(result.errors).toMatchObject({
      id: "Resident ID is required.",
      name: "Full name is required.",
      address: "Address is required.",
      documents: "Documents must be a list."
    });
  });

  it("accepts an empty documents array when the other required fields are valid", () => {
    const result = validateResidentForm({
      ...residents[0],
      documents: []
    });

    expect(result).toEqual({
      isValid: true,
      errors: {}
    });
  });

  it("requires precinct number for registered voters", () => {
    const result = validateResidentForm({
      ...residents[0],
      registeredVoter: true,
      precinctNumber: "   "
    });

    expect(result.isValid).toBe(false);
    expect(result.errors).toMatchObject({
      precinctNumber: "Precinct number is required for registered voters."
    });
  });

  it("does not require precinct number for non-registered voters", () => {
    const result = validateResidentForm({
      ...residents[0],
      registeredVoter: false,
      precinctNumber: ""
    });

    expect(result).toEqual({
      isValid: true,
      errors: {}
    });
  });
});
