import { describe, expect, it } from "vitest";
import { getAccountGroups, getAdminCounters } from "./accountManagement";

describe("accountManagement", () => {
  it("groups accounts by admin, department, and lupon roles", () => {
    const groups = getAccountGroups([
      { id: "lupon-1", role: "lupon", name: "Lupon User" },
      { id: "admin-1", role: "admin", name: "Admin User" },
      { id: "department-1", role: "department", name: "Department User" },
      { id: "department-2", role: "department", name: "Department Backup" }
    ]);

    expect(groups).toEqual([
      {
        role: "admin",
        label: "Admin",
        count: 1,
        accounts: [{ id: "admin-1", role: "admin", name: "Admin User" }]
      },
      {
        role: "department",
        label: "Department",
        count: 2,
        accounts: [
          { id: "department-1", role: "department", name: "Department User" },
          { id: "department-2", role: "department", name: "Department Backup" }
        ]
      },
      {
        role: "lupon",
        label: "Lupon",
        count: 1,
        accounts: [{ id: "lupon-1", role: "lupon", name: "Lupon User" }]
      }
    ]);
  });

  it("returns high-level admin counters without resident remarks", () => {
    const counters = getAdminCounters({
      users: [
        { role: "admin" },
        { role: "department" },
        { role: "department" },
        { role: "lupon" }
      ],
      residents: [{ id: "resident-1" }, { id: "resident-2" }],
      documentRequests: [{ id: "doc-1" }, { id: "doc-2" }, { id: "doc-3" }]
    });

    expect(counters).toEqual({
      totalResidents: 2,
      totalDepartmentAccounts: 2,
      totalLuponAccounts: 1,
      totalDocumentRequests: 3
    });
  });
});
