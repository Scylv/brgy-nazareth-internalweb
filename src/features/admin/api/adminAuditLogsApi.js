import { apiFetch } from "../../../shared/api/client";

export function mapApiAdminAuditLogToAuditLog(apiLog) {
  return {
    id: apiLog.id,
    timestamp: apiLog.timestamp,
    actorName: apiLog.actorName,
    role: apiLog.role,
    action: apiLog.action,
    entityType: apiLog.entityType,
    entityReference: apiLog.entityReference,
    details: apiLog.details
  };
}

export function mapApiAdminAuditLogListResponse(data) {
  const response = data && typeof data === "object" ? data : {};
  const items = Array.isArray(response.items) ? response.items : [];
  const page = Number.isInteger(response.page) && response.page > 0 ? response.page : 1;
  const pageSize =
    Number.isInteger(response.pageSize) && response.pageSize > 0 ? response.pageSize : 25;
  const total = Number.isInteger(response.total) && response.total >= 0 ? response.total : items.length;
  const totalPages =
    Number.isInteger(response.totalPages) && response.totalPages >= 0
      ? response.totalPages
      : total > 0
        ? Math.ceil(total / pageSize)
        : 0;

  return {
    items: items.map(mapApiAdminAuditLogToAuditLog),
    page,
    pageSize,
    total,
    totalPages,
    hasNext: Boolean(response.hasNext),
    hasPrevious: Boolean(response.hasPrevious)
  };
}

export async function fetchAdminAuditLogs({
  page = 1,
  pageSize = 25,
  actor = "",
  role = "",
  action = "",
  entityType = "",
  dateFrom = "",
  dateTo = ""
} = {}) {
  const searchParams = new URLSearchParams();

  searchParams.set("page", String(page));
  searchParams.set("pageSize", String(pageSize));

  for (const [key, value] of Object.entries({ actor, role, action, entityType, dateFrom, dateTo })) {
    if (String(value ?? "").trim()) {
      searchParams.set(key, String(value).trim());
    }
  }

  const data = await apiFetch(`/api/admin/audit-logs?${searchParams.toString()}`);

  return mapApiAdminAuditLogListResponse(data);
}
