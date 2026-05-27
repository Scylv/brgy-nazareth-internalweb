import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import AdminPanel from "./AdminPanel";

const noop = () => {};
const adminAccounts = Array.from({ length: 6 }, (_, index) => ({
  id: `admin-${index + 1}`,
  name: `Admin User ${index + 1}`,
  username: `admin${index + 1}`,
  role: "admin",
  status: "active",
  createdAt: "2026-05-27T00:00:00.000Z"
}));

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
      auditLogFilters={{
        actor: "juan",
        role: "lupon",
        action: "updated",
        entityType: "lupon_case",
        dateFrom: "2026-05-01",
        dateTo: "2026-05-27"
      }}
      auditLogPagination={{
        page: 1,
        pageSize: 25,
        total: 1,
        totalPages: 1,
        hasNext: false,
        hasPrevious: false
      }}
      auditLogs={[
        {
          id: "AUD-1",
          timestamp: "2026-05-26T04:00:00.000Z",
          actorName: "Juan Santos",
          role: "lupon",
          action: "lupon_case.details_updated",
          entityType: "lupon_case",
          entityReference: "LC-2026-0001",
          details: "Lupon case updated",
          confidentialSummary: "must not render",
          noteBody: "must not render",
          storage_path: "resident-documents/RBI-1/private.pdf",
          stored_filename: "private.pdf"
        }
      ]}
      documentRequests={[]}
      onAdminResidentPageChange={noop}
      onAdminResidentQueryChange={noop}
      onAdminResidentStatusFilterChange={noop}
      onAuditLogFilterChange={noop}
      onAuditLogPageChange={noop}
      onCreateResident={noop}
      users={[
        ...adminAccounts,
        {
          id: "dept-1",
          name: "Department User",
          username: "department1",
          role: "department",
          status: "active",
          createdAt: "2026-05-27T00:00:00.000Z"
        },
        {
          id: "lupon-1",
          name: "Lupon User",
          username: "lupon1",
          role: "lupon",
          status: "active",
          createdAt: "2026-05-27T00:00:00.000Z"
        }
      ]}
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

  it("renders staff account search and three-account pagination per role", () => {
    const markup = renderPanel();

    expect(markup).toContain("Search staff");
    expect(markup).toContain("Name, username, role, status");
    expect(markup).toContain("6 matching accounts");
    expect(markup).toContain("Page 1 of 2");
    expect(markup).not.toContain("per page");
    expect(markup).toContain("Admin User 1");
    expect(markup).toContain("Admin User 3");
    expect(markup).not.toContain("Admin User 4");
  });

  it("renders audit logs with filters, pagination, and safe details only", () => {
    const markup = renderPanel();

    expect(markup).toContain("Audit Logs");
    expect(markup).toContain("Administrative Activity");
    expect(markup).toContain("1 matching log");
    expect(markup).toContain("2026-05-26 04:00:00");
    expect(markup).toContain("Juan Santos");
    expect(markup).toContain("lupon_case.details_updated");
    expect(markup).toContain("LC-2026-0001");
    expect(markup).toContain("Lupon case updated");
    expect(markup).toContain('name="actor"');
    expect(markup).toContain('value="juan"');
    expect(markup).toContain('name="entityType"');
    expect(markup).toContain('value="lupon_case"');
    expect(markup).toContain("Page 1 of 1");
    expect(markup).not.toContain("must not render");
    expect(markup).not.toContain("storage_path");
    expect(markup).not.toContain("stored_filename");
    expect(markup).not.toContain("private.pdf");
  });

  it("renders audit log empty state", () => {
    const markup = renderPanel({
      auditLogPagination: {
        page: 1,
        pageSize: 25,
        total: 0,
        totalPages: 0,
        hasNext: false,
        hasPrevious: false
      },
      auditLogs: []
    });

    expect(markup).toContain("0 matching logs");
    expect(markup).toContain("No audit logs match the current filters.");
    expect(markup).toContain("Page 1 of 1");
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
