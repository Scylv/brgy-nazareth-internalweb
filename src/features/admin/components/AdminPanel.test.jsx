import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import AdminPanel from "./AdminPanel";

const noop = () => {};

function renderPanel(props = {}) {
  return renderToStaticMarkup(
    <AdminPanel
      adminResidentPagination={{
        page: 2,
        pageSize: 25,
        total: 76,
        totalPages: 4,
        hasNext: true,
        hasPrevious: true
      }}
      adminResidentStatusFilter="active"
      adminResidents={[
        {
          id: "RBI-2026-0001",
          householdId: "HH-001",
          fullName: "Active Resident",
          gender: "Female",
          address: "Nazareth",
          exactAddress: "Door 1",
          sitio: "Sitio One",
          precinctNumber: "0012A",
          contactNumber: "09171234567",
          sectors: ["Registered Voter"],
          statusColor: "green",
          archived: false
        },
        {
          id: "RBI-2026-0002",
          householdId: "HH-002",
          fullName: "Archived Resident",
          gender: "Male",
          address: "Nazareth",
          archived: true
        }
      ]}
      documentRequests={[]}
      onAdminResidentPageChange={noop}
      onAdminResidentQueryChange={noop}
      onAdminResidentStatusFilterChange={noop}
      onCreateResident={noop}
      users={[]}
      residents={[]}
      {...props}
    />
  );
}

describe("AdminPanel", () => {
  it("renders resident pagination, status filtering, and add resident controls", () => {
    const markup = renderPanel();

    expect(markup).toContain("Resident Management");
    expect(markup).toContain("Add Resident");
    expect(markup).toContain("76 matching records");
    expect(markup).toContain("Page 2 of 4");
    expect(markup).toContain("Previous");
    expect(markup).toContain("Next");
    expect(markup).toContain("Archived Resident");
    expect(markup).toContain("Restore");
  });

  it("renders add resident validation state", () => {
    const markup = renderPanel({
      initialResidentFormMode: "create",
      residentFormError: "Resident ID, household ID, full name, gender, and address are required."
    });

    expect(markup).toContain("Create Resident");
    expect(markup).toContain(
      "Resident ID, household ID, full name, gender, and address are required."
    );
    expect(markup).toContain("Resident ID / RBI");
    expect(markup).toContain("Household ID");
    expect(markup).toContain("Gender");
    expect(markup).toContain("Create resident");
    expect(markup).toContain('<option value="green" selected="">Green</option>');
    expect(markup).not.toContain("lupon_confidential");
  });
});
