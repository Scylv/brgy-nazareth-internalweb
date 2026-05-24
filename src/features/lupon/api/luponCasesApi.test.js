import { afterEach, describe, expect, it, vi } from "vitest";
import {
  fetchLuponCases,
  mapApiLuponCaseToLuponCase,
  mapApiLuponCasesResponse
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
        caseType: "Address Verification",
        status: "under_mediation",
        priority: "high",
        confidentialSummary: "Address mismatch reported during verification.",
        openedAt: "2026-05-01T00:00:00.000Z",
        resolvedAt: null,
        assignedLuponProfileId: "lupon-1",
        createdByProfileId: "lupon-1",
        createdAt: "2026-05-01T00:00:00.000Z",
        updatedAt: "2026-05-02T00:00:00.000Z"
      })
    ).toEqual({
      id: "LC-2026-0001",
      residentId: "RBI-2024-0002",
      caseNumber: "LPN-2026-0001",
      caseType: "Address Verification",
      status: "under_mediation",
      priority: "high",
      confidentialSummary: "Address mismatch reported during verification.",
      openedAt: "2026-05-01",
      resolvedAt: "",
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
});
