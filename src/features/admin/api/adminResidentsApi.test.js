import { afterEach, describe, expect, it, vi } from "vitest";
import {
  createAdminResident,
  fetchAdminResidents,
  mapApiAdminResidentListResponse,
  mapApiAdminResidentToResident
} from "./adminResidentsApi";

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("adminResidentsApi", () => {
  it("maps Admin resident responses without Lupon confidential fields", () => {
    const resident = mapApiAdminResidentToResident({
      id: "RBI-2026-0001",
      householdId: "HH-IMPORT-001",
      fullName: "Test Resident Alpha",
      birthDate: "1988-03-14",
      gender: "Female",
      civilStatus: "Married",
      occupation: "Teacher",
      address: "Barangay Nazareth",
      exactAddress: "House 1, Zone 1",
      precinctNumber: "0012A",
      contactNumber: "09171234567",
      sitio: "Sitio One",
      additionalInformation: "Safe registry note",
      sectors: ["Registered Voter"],
      registeredVoter: true,
      statusColor: "green",
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
      gender: "Female",
      civilStatus: "Married",
      occupation: "Teacher",
      address: "Barangay Nazareth",
      exactAddress: "House 1, Zone 1",
      precinctNumber: "0012A",
      contactNumber: "09171234567",
      sitio: "Sitio One",
      additionalInformation: "Safe registry note",
      sectors: ["Registered Voter"],
      registeredVoter: true,
      statusColor: "green",
      status: "green",
      archived: false,
      archivedAt: undefined,
      createdAt: undefined,
      updatedAt: undefined
    });
    expect(resident).not.toHaveProperty("confidentialSummary");
    expect(resident).not.toHaveProperty("noteBody");
  });

  it("maps paginated Admin resident responses", () => {
    const page = mapApiAdminResidentListResponse({
      items: [
        {
          id: "RBI-2026-0001",
          householdId: "HH-IMPORT-001",
          fullName: "Test Resident Alpha",
          gender: "Female",
          address: "Barangay Nazareth",
          sectors: ["Senior Citizen"],
          statusColor: "green"
        }
      ],
      page: 2,
      pageSize: 25,
      total: 51,
      totalPages: 3,
      hasNext: true,
      hasPrevious: true
    });

    expect(page).toMatchObject({
      page: 2,
      pageSize: 25,
      total: 51,
      totalPages: 3,
      hasNext: true,
      hasPrevious: true
    });
    expect(page.items[0]).toMatchObject({
      id: "RBI-2026-0001",
      gender: "Female",
      sectors: ["Senior Citizen"],
      statusColor: "green"
    });
  });

  it("safely maps missing Admin resident pagination fields", () => {
    expect(mapApiAdminResidentListResponse(null)).toEqual({
      items: [],
      page: 1,
      pageSize: 25,
      total: 0,
      totalPages: 0,
      hasNext: false,
      hasPrevious: false
    });

    const page = mapApiAdminResidentListResponse({
      residents: [
        {
          id: "RBI-2026-0001",
          fullName: "Legacy Resident",
          address: "Nazareth",
          statusColor: "green"
        }
      ]
    });

    expect(page).toMatchObject({
      page: 1,
      pageSize: 25,
      total: 1,
      totalPages: 1,
      hasNext: false,
      hasPrevious: false
    });
    expect(page.items[0]).toMatchObject({
      id: "RBI-2026-0001",
      fullName: "Legacy Resident"
    });
  });

  it("requests backend pagination and status filters without loading all residents", async () => {
    const fetchMock = vi.fn(async () =>
      new Response(
        JSON.stringify({
          items: [],
          page: 3,
          pageSize: 50,
          total: 0,
          totalPages: 0,
          hasNext: false,
          hasPrevious: true
        }),
        {
          headers: { "content-type": "application/json" }
        }
      )
    );
    vi.stubGlobal("fetch", fetchMock);

    await fetchAdminResidents({
      page: 3,
      pageSize: 50,
      query: "mahogany",
      status: "archived"
    });

    expect(fetchMock.mock.calls[0][0]).toContain(
      "/api/admin/residents?page=3&pageSize=50&search=mahogany&status=archived&showArchived=false&archived=true"
    );
  });

  it("requests showArchived when Admin residents status includes all records", async () => {
    const fetchMock = vi.fn(async () =>
      new Response(
        JSON.stringify({
          items: [],
          page: 1,
          pageSize: 25,
          total: 0,
          totalPages: 0,
          hasNext: false,
          hasPrevious: false
        }),
        {
          headers: { "content-type": "application/json" }
        }
      )
    );
    vi.stubGlobal("fetch", fetchMock);

    await fetchAdminResidents({
      status: "all"
    });

    expect(fetchMock.mock.calls[0][0]).toContain(
      "/api/admin/residents?page=1&pageSize=25&status=all&showArchived=true&archived=false"
    );
  });

  it("posts Admin resident creation payloads", async () => {
    const fetchMock = vi.fn(async () =>
      new Response(
        JSON.stringify({
          resident: {
            id: "RBI-2026-0100",
            householdId: "HH-MANUAL-100",
            fullName: "Manual Resident",
            gender: "Female",
            address: "Nazareth",
            sectors: [],
            statusColor: "green"
          },
          warnings: []
        }),
        {
          status: 201,
          headers: { "content-type": "application/json" }
        }
      )
    );
    vi.stubGlobal("fetch", fetchMock);

    const created = await createAdminResident({
      id: "RBI-2026-0100",
      householdId: "HH-MANUAL-100",
      fullName: "Manual Resident",
      gender: "Female",
      address: "Nazareth"
    });

    expect(created.resident).toMatchObject({
      id: "RBI-2026-0100",
      fullName: "Manual Resident"
    });
    expect(fetchMock.mock.calls[0][0]).toContain("/api/admin/residents");
    expect(fetchMock.mock.calls[0][1]).toMatchObject({
      method: "POST"
    });
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toMatchObject({
      id: "RBI-2026-0100",
      householdId: "HH-MANUAL-100",
      fullName: "Manual Resident",
      gender: "Female",
      address: "Nazareth",
      sectors: [],
      statusColor: "green"
    });
  });
});
