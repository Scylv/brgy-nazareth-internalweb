import { describe, expect, it } from "vitest";
import { residents } from "../../data/residents";
import {
  filterResidents,
  filterResidentsByStatus,
  normalizeResidentStatusFilter,
  searchResidents
} from "./filterResidents";

describe("resident filtering", () => {
  it("returns all residents when no search query or status filter is set", () => {
    expect(filterResidents({ residents })).toHaveLength(residents.length);
  });

  it("searches residents by name, RBI ID, and household ID", () => {
    expect(searchResidents("maria", residents).map((resident) => resident.name)).toEqual([
      "Maria Santos"
    ]);
    expect(searchResidents("RBI-2024-0003", residents).map((resident) => resident.name)).toEqual([
      "Pedro Bautista"
    ]);
    expect(searchResidents("HH-NAZ-1001", residents).map((resident) => resident.name)).toEqual([
      "Juan Dela Cruz"
    ]);
  });

  it("ignores surrounding whitespace and casing in search queries", () => {
    expect(searchResidents("  MARIA  ", residents).map((resident) => resident.name)).toEqual([
      "Maria Santos"
    ]);
  });

  it("filters residents by status", () => {
    expect(filterResidentsByStatus("green", residents).map((resident) => resident.status)).toEqual([
      "green"
    ]);
    expect(filterResidentsByStatus("yellow", residents).map((resident) => resident.status)).toEqual([
      "yellow"
    ]);
    expect(filterResidentsByStatus("red", residents).map((resident) => resident.status)).toEqual([
      "red"
    ]);
  });

  it("combines search query and status filtering", () => {
    expect(
      filterResidents({
        query: "RBI-2024",
        statusFilter: "yellow",
        residents
      }).map((resident) => resident.name)
    ).toEqual(["Maria Santos"]);
  });

  it("returns no residents when search and status filters do not overlap", () => {
    expect(
      filterResidents({
        query: "Maria",
        statusFilter: "red",
        residents
      })
    ).toEqual([]);
  });

  it("falls back to all statuses for unknown status filters", () => {
    expect(normalizeResidentStatusFilter("blue")).toBe("all");
    expect(filterResidentsByStatus("blue", residents)).toHaveLength(residents.length);
  });
});
