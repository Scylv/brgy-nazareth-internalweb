import { describe, expect, it } from "vitest";
import { residents } from "../../../data/residents";
import { createBlankResident } from "./createBlankResident";

describe("createBlankResident", () => {
  it("creates a blank resident record with the next local IDs", () => {
    const resident = createBlankResident(residents);

    expect(resident).toMatchObject({
      id: "RBI-2024-0004",
      householdId: "HH-NAZ-1091",
      name: "",
      address: "",
      status: "green",
      registeredVoter: false,
      precinctNumber: "",
      sectors: [],
      documents: []
    });
  });
});
