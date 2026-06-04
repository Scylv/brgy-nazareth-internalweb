import { afterEach, describe, expect, it, vi } from "vitest";
import {
  fetchAdminAuditLogs,
  mapApiAdminAuditLogListResponse,
  mapApiAdminAuditLogToAuditLog
} from "./adminAuditLogsApi";

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("adminAuditLogsApi", () => {
  it("maps paginated audit logs without confidential details", () => {
    const log = mapApiAdminAuditLogToAuditLog({
      id: "AUD-1",
      timestamp: "2026-05-26T04:00:00.000Z",
      actorName: "Juan Santos",
      role: "lupon",
      action: "lupon_case.details_updated",
      entityType: "lupon_case",
      entityReference: "LC-2026-0001",
      details: "Lupon case updated",
      confidentialSummary: "must not leak",
      noteBody: "must not leak",
      storagePath: "resident-documents/RBI-1/secret.pdf",
      storedFilename: "secret.pdf"
    });

    expect(log).toEqual({
      id: "AUD-1",
      timestamp: "2026-05-26T04:00:00.000Z",
      actorName: "Juan Santos",
      role: "lupon",
      action: "lupon_case.details_updated",
      entityType: "lupon_case",
      entityReference: "LC-2026-0001",
      details: "Lupon case updated"
    });
    expect(log).not.toHaveProperty("confidentialSummary");
    expect(log).not.toHaveProperty("noteBody");
    expect(log).not.toHaveProperty("storagePath");
    expect(log).not.toHaveProperty("storedFilename");
  });

  it("maps paginated audit log responses", () => {
    const page = mapApiAdminAuditLogListResponse({
      items: [
        {
          id: "AUD-1",
          timestamp: "2026-05-26T04:00:00.000Z",
          actorName: "Elena Ledesma",
          role: "department",
          action: "document_request.released",
          entityType: "document_request",
          entityReference: "DOC-1",
          details: "Document request released"
        }
      ],
      page: 1,
      pageSize: 25,
      total: 1,
      totalPages: 1,
      hasNext: false,
      hasPrevious: false
    });

    expect(page.total).toBe(1);
    expect(page.items[0].details).toBe("Document request released");
  });

  it("safely maps missing audit log pagination fields", () => {
    expect(mapApiAdminAuditLogListResponse(null)).toEqual({
      items: [],
      page: 1,
      pageSize: 25,
      total: 0,
      totalPages: 0,
      hasNext: false,
      hasPrevious: false
    });

    const page = mapApiAdminAuditLogListResponse({
      items: [
        {
          id: "AUD-1",
          timestamp: "2026-05-26T04:00:00.000Z",
          actorName: "System",
          action: "resident.admin_created",
          entityType: "resident",
          entityReference: "RBI-2026-0001",
          details: "Resident created"
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
      id: "AUD-1",
      details: "Resident created"
    });
  });

  it("requests audit log pagination and filters", async () => {
    const fetchMock = vi.fn(async () =>
      new Response(
        JSON.stringify({
          items: [],
          page: 2,
          pageSize: 25,
          total: 0,
          totalPages: 0
        }),
        {
          headers: { "content-type": "application/json" }
        }
      )
    );
    vi.stubGlobal("fetch", fetchMock);

    await fetchAdminAuditLogs({
      page: 2,
      pageSize: 25,
      role: "lupon",
      action: "updated",
      entityType: "lupon_case"
    });

    expect(fetchMock.mock.calls[0][0]).toContain(
      "/api/admin/audit-logs?page=2&pageSize=25&role=lupon&action=updated&entityType=lupon_case"
    );
  });
});
