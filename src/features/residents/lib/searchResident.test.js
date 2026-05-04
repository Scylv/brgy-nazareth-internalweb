import { describe, expect, it } from "vitest";
import { residents } from "../../../data/residents";
import { searchResident } from "./searchResident";

describe("searchResident", () => {
  it("returns all residents for an empty query", () => {
    expect(searchResident("", residents)).toHaveLength(residents.length);
  });

  it("ignores surrounding whitespace and casing in the query", () => {
    expect(searchResident("  MARIA  ", residents).map((resident) => resident.name)).toEqual([
      "Maria Santos"
    ]);
  });

  it("matches residents by name", () => {
    expect(searchResident("maria", residents).map((resident) => resident.name)).toEqual([
      "Maria Santos"
    ]);
  });

  it("matches residents by id", () => {
    expect(searchResident("RBI-2024-0003", residents)[0].name).toBe("Pedro Bautista");
  });

  it("matches residents by household id", () => {
    expect(searchResident("HH-NAZ-1001", residents)[0].name).toBe("Juan Dela Cruz");
  });
});
