import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import LuponDashboard from "./LuponDashboard";

const noop = () => {};

function renderDashboard(props = {}) {
  return renderToStaticMarkup(
    <LuponDashboard
      documentRequests={[]}
      luponCases={[]}
      onOpenForm={noop}
      onQueryChange={noop}
      onSelectResident={noop}
      onStatusFilterChange={noop}
      query=""
      residents={[
        {
          id: "RBI-2024-0002",
          householdId: "HH-NAZ-1034",
          name: "Maria Santos",
          status: "yellow",
          remarks: "Legacy local remark must not render.",
          caseReason: "Legacy local case reason must not render."
        }
      ]}
      selectedResident={{
        id: "RBI-2024-0002",
        name: "Maria Santos"
      }}
      selectedResidentId="RBI-2024-0002"
      statusFilter="all"
      {...props}
    />
  );
}

function createResident(index, status = "green") {
  return {
    id: `RBI-2024-${String(index).padStart(4, "0")}`,
    householdId: `HH-NAZ-${index}`,
    name: `Resident ${index}`,
    status
  };
}

describe("LuponDashboard", () => {
  it("renders confidential case summaries from Lupon API cases", () => {
    const markup = renderDashboard({
      luponCases: [
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
    });

    expect(markup).toContain("Address Verification (LPN-2026-0001)");
    expect(markup).toContain("Address mismatch reported during verification.");
    expect(markup).not.toContain("Legacy local");
  });

  it("does not show manual resident creation actions in the Lupon registry", () => {
    const markup = renderDashboard();

    expect(markup).not.toContain("Add resident");
  });

  it("shows default case summary text when the only Lupon case is resolved", () => {
    const markup = renderDashboard({
      luponCases: [
        {
          id: "LC-2026-0001",
          residentId: "RBI-2024-0002",
          caseNumber: "LPN-2026-0001",
          caseTitle: "Resolved dispute",
          caseType: "Community Dispute",
          status: "resolved",
          confidentialSummary: "Resolved confidential history remains stored.",
          openedAt: "2026-05-01",
          resolvedAt: "2026-05-27"
        }
      ]
    });

    expect(markup).toContain("No active Lupon case");
    expect(markup).toContain("No confidential case summary");
    expect(markup).not.toContain("Resolved confidential history remains stored.");
  });

  it("renders five residents per page while summary cards count the full filtered list", () => {
    const residents = [
      createResident(1, "yellow"),
      createResident(2, "yellow"),
      createResident(3, "red"),
      createResident(4),
      createResident(5),
      createResident(6)
    ];
    const markup = renderDashboard({
      residents,
      selectedResident: residents[0],
      selectedResidentId: residents[0].id
    });

    expect(markup).toContain("6 residents shown");
    expect(markup).toContain(">6<");
    expect(markup).toContain(">2<");
    expect(markup).toContain(">1<");
    expect(markup).toContain("Resident 1");
    expect(markup).toContain("Resident 5");
    expect(markup).not.toContain("Resident 6");
    expect(markup).toContain("Page 1 of 2");
    expect(markup).toContain("Previous");
    expect(markup).toContain("Next");
  });
});
