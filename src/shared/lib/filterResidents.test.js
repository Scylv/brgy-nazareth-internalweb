import { describe, expect, it } from "vitest";
import { residents } from "../../data/residents";
import { mapApiResidentToResident } from "../../features/residents/api/residentsApi";
import {
  filterResidents,
  filterResidentsByStatus,
  getResidentStatusCounts,
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

  it("searches and filters residents mapped from backend-shaped API objects", () => {
    const databaseResidents = [
      mapApiResidentToResident({
        id: "RBI-2026-0100",
        householdId: "HH-DB-0100",
        fullName: "Database Resident",
        statusColor: "green"
      }),
      mapApiResidentToResident({
        id: "RBI-2026-0101",
        householdId: "HH-DB-0101",
        fullName: "For Lupon Review",
        statusColor: "yellow"
      })
    ];

    expect(
      filterResidents({
        query: "database",
        statusFilter: "green",
        residents: databaseResidents
      }).map((resident) => resident.id)
    ).toEqual(["RBI-2026-0100"]);
    expect(searchResidents("HH-DB-0101", databaseResidents).map((resident) => resident.name)).toEqual([
      "For Lupon Review"
    ]);
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

  it("counts residents by status and Lupon referral need", () => {
    expect(getResidentStatusCounts(residents)).toEqual({
      all: 3,
      green: 1,
      yellow: 1,
      red: 1,
      luponReferral: 2
    });
  });

  it("counts residents from the provided resident subset", () => {
    const matchingResidents = searchResidents("RBI-2024-0002", residents);

    expect(getResidentStatusCounts(matchingResidents)).toEqual({
      all: 1,
      green: 0,
      yellow: 1,
      red: 0,
      luponReferral: 1
    });
  });
});
