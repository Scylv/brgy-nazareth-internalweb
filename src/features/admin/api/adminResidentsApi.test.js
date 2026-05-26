import { describe, expect, it } from "vitest";
import { mapApiAdminResidentToResident } from "./adminResidentsApi";

describe("adminResidentsApi", () => {
  it("maps Admin resident responses without Lupon confidential fields", () => {
    const resident = mapApiAdminResidentToResident({
      id: "RBI-2026-0001",
      householdId: "HH-IMPORT-001",
      fullName: "Test Resident Alpha",
      birthDate: "1988-03-14",
      civilStatus: "Married",
      occupation: "Teacher",
      address: "Barangay Nazareth",
      exactAddress: "House 1, Zone 1",
      precinctNumber: "0012A",
      contactNumber: "09171234567",
      sitio: "Sitio One",
      additionalInformation: "Safe registry note",
      archived: false,
      confidentialSummary: "must not leak",
      noteBody: "must not leak"
    });

    expect(resident).toEqual({
      id: "RBI-2026-0001",
      householdId: "HH-IMPORT-001",
      fullName: "Test Resident Alpha",
      name: "Test Resident Alpha",
      birthDate: "1988-03-14",
      civilStatus: "Married",
      occupation: "Teacher",
      address: "Barangay Nazareth",
      exactAddress: "House 1, Zone 1",
      precinctNumber: "0012A",
      contactNumber: "09171234567",
      sitio: "Sitio One",
      additionalInformation: "Safe registry note",
      archived: false,
      archivedAt: undefined,
      createdAt: undefined,
      updatedAt: undefined
    });
    expect(resident).not.toHaveProperty("confidentialSummary");
    expect(resident).not.toHaveProperty("noteBody");
  });
});
