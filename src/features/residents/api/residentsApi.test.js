import { afterEach, describe, expect, it, vi } from "vitest";
import { fetchResidents, mapApiResidentToResident } from "./residentsApi";

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("residents API", () => {
  it("maps backend resident fields to the frontend resident format", () => {
    const resident = mapApiResidentToResident({
      id: "RBI-2026-0001",
      householdId: "HH-NAZ-2001",
      fullName: "Ana Reyes",
      birthDate: "1990-01-15",
      gender: "Female",
      civilStatus: "Married",
      occupation: "Teacher",
      address: "Purok 1, Nazareth",
      contactNumber: "09170000000",
      email: "ana.reyes@example.com",
      additionalInformation: "Seeded database resident.",
      sectors: ["Registered Voter"],
      registeredVoter: true,
      precinctNumber: "0101A",
      statusColor: "yellow",
      createdAt: "2026-05-01T00:00:00.000Z",
      updatedAt: "2026-05-01T00:00:00.000Z"
    });

    expect(resident).toMatchObject({
      id: "RBI-2026-0001",
      householdId: "HH-NAZ-2001",
      name: "Ana Reyes",
      fullName: "Ana Reyes",
      status: "yellow",
      statusColor: "yellow",
      documents: []
    });
  });

  it("fetches and maps residents from the database API response", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        new Response(
          JSON.stringify({
            residents: [
              {
                id: "RBI-2026-0002",
                householdId: "HH-NAZ-2002",
                fullName: "Ben Cruz",
                statusColor: "green"
              }
            ]
          }),
          {
            headers: { "content-type": "application/json" }
          }
        )
      )
    );

    await expect(fetchResidents()).resolves.toEqual([
      expect.objectContaining({
        id: "RBI-2026-0002",
        name: "Ben Cruz",
        status: "green"
      })
    ]);
  });
});
