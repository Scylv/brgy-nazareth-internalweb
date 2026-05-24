import { afterEach, describe, expect, it, vi } from "vitest";
import { fetchResidents, mapApiResidentToResident, updateResident } from "./residentsApi";

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

  it("updates allowed resident fields without sending confidential Lupon form fields", async () => {
    const fetchMock = vi.fn(async (_path, options) => {
      expect(options.method).toBe("PATCH");
      expect(JSON.parse(options.body)).toEqual({
        householdId: "HH-NAZ-1034",
        fullName: "Maria S. Santos",
        birthDate: "1992-07-20",
        gender: "Female",
        civilStatus: "Single",
        occupation: "Vendor",
        address: "Purok 2, Lower Nazareth",
        contactNumber: "09181112222",
        email: "maria.santos@example.com",
        additionalInformation: "Needs address re-verification.",
        sectors: ["Solo Parent"],
        registeredVoter: true,
        precinctNumber: "0187B",
        status: "green"
      });

      return new Response(
        JSON.stringify({
          resident: {
            id: "RBI-2024-0002",
            fullName: "Maria S. Santos",
            statusColor: "green"
          }
        }),
        {
          headers: { "content-type": "application/json" }
        }
      );
    });

    vi.stubGlobal("fetch", fetchMock);

    await expect(
      updateResident("RBI-2024-0002", {
        id: "RBI-2024-0002",
        householdId: "HH-NAZ-1034",
        name: "Maria S. Santos",
        birthDate: "1992-07-20",
        gender: "Female",
        civilStatus: "Single",
        occupation: "Vendor",
        address: "Purok 2, Lower Nazareth",
        contactNumber: "09181112222",
        email: "maria.santos@example.com",
        additionalInformation: "Needs address re-verification.",
        sectors: ["Solo Parent"],
        registeredVoter: true,
        precinctNumber: "0187B",
        status: "green",
        remarks: "Confidential note",
        caseReason: "Confidential case reason",
        documents: ["Incident Report"]
      })
    ).resolves.toMatchObject({
      id: "RBI-2024-0002",
      name: "Maria S. Santos",
      status: "green"
    });
  });
});
