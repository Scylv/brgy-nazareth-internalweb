import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import LuponDashboard from "./LuponDashboard";

const noop = () => {};

function renderDashboard(props = {}) {
  return renderToStaticMarkup(
    <LuponDashboard
      documentRequests={[]}
      luponCases={[]}
      onAddResident={noop}
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
});
