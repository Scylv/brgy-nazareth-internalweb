import { describe, expect, it } from "vitest";
import {
  getLuponCasesForResident,
  getResidentLuponCaseDisplay
} from "./luponCaseDisplay";

describe("Lupon case display mapping", () => {
  it("selects the latest Lupon case for a resident", () => {
    const cases = [
      {
        id: "LC-OLD",
        residentId: "RBI-2024-0002",
        caseNumber: "LPN-2026-0001",
        caseType: "Address Verification",
        openedAt: "2026-05-01",
        confidentialSummary: "Older summary"
      },
      {
        id: "LC-NEW",
        residentId: "RBI-2024-0002",
        caseNumber: "LPN-2026-0002",
        caseType: "Mediation",
        openedAt: "2026-05-10",
        confidentialSummary: "Latest summary"
      },
      {
        id: "LC-OTHER",
        residentId: "RBI-2024-0003",
        caseNumber: "LPN-2026-0003",
        caseType: "Community Dispute",
        openedAt: "2026-05-12",
        confidentialSummary: "Other resident"
      }
    ];

    expect(getLuponCasesForResident("RBI-2024-0002", cases).map((item) => item.id)).toEqual([
      "LC-NEW",
      "LC-OLD"
    ]);
  });

  it("uses Lupon API case fields for confidential display text", () => {
    expect(
      getResidentLuponCaseDisplay(
        {
          id: "RBI-2024-0002",
          remarks: "Legacy local remark must not render.",
          caseReason: "Legacy local case reason must not render."
        },
        [
          {
            id: "LC-2026-0001",
            residentId: "RBI-2024-0002",
            caseNumber: "LPN-2026-0001",
            caseType: "Address Verification",
            status: "under_mediation",
            confidentialSummary: "Address mismatch reported during verification.",
            openedAt: "2026-05-01"
          }
        ]
      )
    ).toEqual({
      caseLine: "Address Verification (LPN-2026-0001)",
      statusLabel: "Under Mediation",
      summary: "Address mismatch reported during verification."
    });
  });

  it("uses case title as the Lupon list subject when present", () => {
    expect(
      getResidentLuponCaseDisplay(
        { id: "RBI-2024-0002" },
        [
          {
            id: "LC-2026-0001",
            residentId: "RBI-2024-0002",
            caseNumber: "LPN-2026-0001",
            caseTitle: "Imported resident verification",
            caseType: "Address Verification",
            status: "open",
            confidentialSummary: "Verify imported resident details.",
            openedAt: "2026-05-01"
          }
        ]
      )
    ).toMatchObject({
      caseLine: "Imported resident verification (LPN-2026-0001)",
      summary: "Verify imported resident details."
    });
  });

  it("does not treat resolved cases as active dashboard case context", () => {
    const display = getResidentLuponCaseDisplay(
      { id: "RBI-2024-0002" },
      [
        {
          id: "LC-2026-0001",
          residentId: "RBI-2024-0002",
          caseNumber: "LPN-2026-0001",
          caseTitle: "Resolved dispute",
          caseType: "Community Dispute",
          status: "resolved",
          confidentialSummary: "Resolved confidential history remains stored.",
          openedAt: "2026-05-01"
        }
      ]
    );

    expect(display).toEqual({
      caseLine: "No active Lupon case",
      statusLabel: "",
      summary: "No confidential case summary"
    });
  });

  it("does not fall back to legacy resident remarks or case reasons", () => {
    const display = getResidentLuponCaseDisplay(
      {
        id: "RBI-2024-0002",
        remarks: "Legacy local remark must not render.",
        caseReason: "Legacy local case reason must not render."
      },
      []
    );

    expect(display).toEqual({
      caseLine: "No active Lupon case",
      statusLabel: "",
      summary: "No confidential case summary"
    });
    expect(JSON.stringify(display)).not.toContain("Legacy local");
  });
});
