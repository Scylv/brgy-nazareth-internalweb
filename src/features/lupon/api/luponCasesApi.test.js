import { afterEach, describe, expect, it, vi } from "vitest";
import {
  createLuponCaseForResident,
  fetchLuponCases,
  mapApiLuponCaseToLuponCase,
  mapApiLuponCasesResponse,
  resolveLuponCase,
  updateLuponCaseDetails
} from "./luponCasesApi";

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("Lupon cases API", () => {
  it("maps backend Lupon case fields to the frontend format", () => {
    expect(
      mapApiLuponCaseToLuponCase({
        id: "LC-2026-0001",
        residentId: "RBI-2024-0002",
        caseNumber: "LPN-2026-0001",
        caseTitle: "Imported record verification",
        caseType: "Address Verification",
        status: "under_mediation",
        priority: "high",
        confidentialSummary: "Address mismatch reported during verification.",
        openedAt: "2026-05-01T00:00:00.000Z",
        resolvedAt: null,
        resolvedByProfileId: "",
        assignedLuponProfileId: "lupon-1",
        createdByProfileId: "lupon-1",
        createdAt: "2026-05-01T00:00:00.000Z",
        updatedAt: "2026-05-02T00:00:00.000Z"
      })
    ).toEqual({
      id: "LC-2026-0001",
      residentId: "RBI-2024-0002",
      caseNumber: "LPN-2026-0001",
      caseTitle: "Imported record verification",
      caseType: "Address Verification",
      status: "under_mediation",
      priority: "high",
      confidentialSummary: "Address mismatch reported during verification.",
      openedAt: "2026-05-01",
      resolvedAt: "",
      resolvedByProfileId: "",
      assignedLuponProfileId: "lupon-1",
      createdByProfileId: "lupon-1",
      createdAt: "2026-05-01T00:00:00.000Z",
      updatedAt: "2026-05-02T00:00:00.000Z"
    });
  });

  it("returns an empty case list for missing or malformed API data", () => {
    expect(mapApiLuponCasesResponse(null)).toEqual([]);
    expect(mapApiLuponCasesResponse({})).toEqual([]);
    expect(
      mapApiLuponCasesResponse({
        luponCases: [
          { id: "", residentId: "RBI-2024-0002", confidentialSummary: "Invalid missing ID" },
          { id: "LC-2026-0002", residentId: "", confidentialSummary: "Invalid missing resident" }
        ]
      })
    ).toEqual([]);
  });

  it("fetches Lupon cases with the authenticated session and maps them", async () => {
    const fetchMock = vi.fn(async () =>
      new Response(
        JSON.stringify({
          luponCases: [
            {
              id: "LC-2026-0003",
              residentId: "RBI-2024-0003",
              caseNumber: "LPN-2026-0003",
              caseType: "Community Dispute",
              status: "open",
              priority: "normal",
              confidentialSummary: "Active community dispute under Lupon review.",
              openedAt: "2026-05-10"
            }
          ]
        }),
        {
          headers: { "content-type": "application/json" }
        }
      )
    );
    vi.stubGlobal("fetch", fetchMock);

    await expect(fetchLuponCases()).resolves.toEqual([
      expect.objectContaining({
        id: "LC-2026-0003",
        residentId: "RBI-2024-0003",
        confidentialSummary: "Active community dispute under Lupon review."
      })
    ]);
    expect(fetchMock).toHaveBeenCalledWith(
      "http://localhost:3001/api/lupon/cases",
      expect.objectContaining({ credentials: "include" })
    );
  });

  it("creates a Lupon case for a resident with title and summary", async () => {
    const fetchMock = vi.fn(async () =>
      new Response(
        JSON.stringify({
          luponCase: {
            id: "LC-2026-0004",
            residentId: "RBI-2024-0004",
            caseNumber: "LPN-2026-0004",
            caseTitle: "Imported resident verification",
            caseType: "Resident Record Case",
            status: "open",
            priority: "normal",
            confidentialSummary: "Verify imported resident details.",
            openedAt: "2026-05-27"
          }
        }),
        {
          headers: { "content-type": "application/json" },
          status: 201
        }
      )
    );
    vi.stubGlobal("fetch", fetchMock);

    await expect(
      createLuponCaseForResident({
        residentId: "RBI-2024-0004",
        caseTitle: "Imported resident verification",
        confidentialSummary: "Verify imported resident details."
      })
    ).resolves.toEqual(
      expect.objectContaining({
        caseTitle: "Imported resident verification",
        confidentialSummary: "Verify imported resident details.",
        residentId: "RBI-2024-0004"
      })
    );
    expect(fetchMock).toHaveBeenCalledWith(
      "http://localhost:3001/api/lupon/cases",
      expect.objectContaining({
        body: JSON.stringify({
          residentId: "RBI-2024-0004",
          caseTitle: "Imported resident verification",
          confidentialSummary: "Verify imported resident details."
        }),
        credentials: "include",
        method: "POST"
      })
    );
  });

  it("updates a Lupon case title and summary with the authenticated session", async () => {
    const fetchMock = vi.fn(async () =>
      new Response(
        JSON.stringify({
          luponCase: {
            id: "LC-2026-0003",
            residentId: "RBI-2024-0003",
            caseNumber: "LPN-2026-0003",
            caseTitle: "Updated title",
            caseType: "Community Dispute",
            status: "open",
            priority: "normal",
            confidentialSummary: "Updated saved summary.",
            openedAt: "2026-05-10"
          }
        }),
        {
          headers: { "content-type": "application/json" }
        }
      )
    );
    vi.stubGlobal("fetch", fetchMock);

    await expect(
      updateLuponCaseDetails("LC-2026-0003", {
        caseTitle: "Updated title",
        confidentialSummary: "Updated saved summary."
      })
    ).resolves.toEqual(
      expect.objectContaining({
        id: "LC-2026-0003",
        caseTitle: "Updated title",
        confidentialSummary: "Updated saved summary."
      })
    );
    expect(fetchMock).toHaveBeenCalledWith(
      "http://localhost:3001/api/lupon/cases/LC-2026-0003",
      expect.objectContaining({
        body: JSON.stringify({
          caseTitle: "Updated title",
          confidentialSummary: "Updated saved summary."
        }),
        credentials: "include",
        method: "PATCH"
      })
    );
  });

  it("resolves a Lupon case with the authenticated session", async () => {
    const fetchMock = vi.fn(async () =>
      new Response(
        JSON.stringify({
          luponCase: {
            id: "LC-2026-0003",
            residentId: "RBI-2024-0003",
            caseNumber: "LPN-2026-0003",
            caseTitle: "Resolved title",
            caseType: "Community Dispute",
            status: "resolved",
            priority: "normal",
            confidentialSummary: "Resolved summary remains available to Lupon history.",
            openedAt: "2026-05-10",
            resolvedAt: "2026-05-27",
            resolvedByProfileId: "lupon-1"
          }
        }),
        {
          headers: { "content-type": "application/json" }
        }
      )
    );
    vi.stubGlobal("fetch", fetchMock);

    await expect(resolveLuponCase("LC-2026-0003")).resolves.toEqual(
      expect.objectContaining({
        id: "LC-2026-0003",
        status: "resolved",
        resolvedAt: "2026-05-27",
        confidentialSummary: "Resolved summary remains available to Lupon history."
      })
    );
    expect(fetchMock).toHaveBeenCalledWith(
      "http://localhost:3001/api/lupon/cases/LC-2026-0003/resolve",
      expect.objectContaining({
        credentials: "include",
        method: "POST"
      })
    );
  });
});
