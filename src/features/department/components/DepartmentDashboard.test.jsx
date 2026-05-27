import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import DepartmentDashboard from "./DepartmentDashboard";

const noop = () => {};

function createResident(index, status = "green") {
  return {
    id: `RBI-2024-${String(index).padStart(4, "0")}`,
    householdId: `HH-NAZ-${index}`,
    name: `Resident ${index}`,
    birthDate: "1990-01-01",
    civilStatus: "Single",
    address: `Purok ${index}`,
    status
  };
}

function renderDashboard(props = {}) {
  const residents = props.residents ?? [
    createResident(1),
    createResident(2),
    createResident(3),
    createResident(4),
    createResident(5),
    createResident(6)
  ];

  return renderToStaticMarkup(
    <DepartmentDashboard
      documentRequestError=""
      documentRequests={[]}
      isDocumentRequestLoading={false}
      isResidentLoading={false}
      onDocumentRequestSave={noop}
      onQueryChange={noop}
      onSelectResident={noop}
      onStatusFilterChange={noop}
      query=""
      residentDataSource="Database API"
      residentError=""
      residentSearchResidents={residents}
      residents={residents}
      results={residents}
      statusFilter="all"
      {...props}
    />
  );
}

describe("DepartmentDashboard", () => {
  it("paginates resident search results without changing the full result count", () => {
    const markup = renderDashboard();

    expect(markup).toContain("6 residents found");
    expect(markup).toContain("Resident 1");
    expect(markup).toContain("Resident 5");
    expect(markup).not.toContain("Resident 6");
    expect(markup).toContain("Page 1 of 2");
    expect(markup).toContain("Previous");
    expect(markup).toContain("Next");
  });
});
