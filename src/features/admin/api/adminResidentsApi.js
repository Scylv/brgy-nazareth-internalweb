import { apiFetch } from "../../../shared/api/client";

export function mapApiAdminResidentToResident(apiResident) {
  return {
    id: apiResident.id,
    householdId: apiResident.householdId,
    fullName: apiResident.fullName,
    name: apiResident.fullName,
    birthDate: apiResident.birthDate,
    gender: apiResident.gender,
    civilStatus: apiResident.civilStatus,
    occupation: apiResident.occupation,
    address: apiResident.address,
    exactAddress: apiResident.exactAddress,
    precinctNumber: apiResident.precinctNumber ?? "",
    contactNumber: apiResident.contactNumber,
    sitio: apiResident.sitio,
    additionalInformation: apiResident.additionalInformation,
    sectors: apiResident.sectors ?? [],
    registeredVoter: Boolean(apiResident.registeredVoter),
    statusColor: apiResident.statusColor,
    status: apiResident.statusColor,
    archived: Boolean(apiResident.archived),
    archivedAt: apiResident.archivedAt,
    createdAt: apiResident.createdAt,
    updatedAt: apiResident.updatedAt
  };
}

export function mapApiAdminResidentListResponse(data) {
  const response = data && typeof data === "object" ? data : {};
  const items = Array.isArray(response.items)
    ? response.items
    : Array.isArray(response.residents)
      ? response.residents
      : [];
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
    items: items.map(mapApiAdminResidentToResident),
    page,
    pageSize,
    total,
    totalPages,
    hasNext: Boolean(response.hasNext),
    hasPrevious: Boolean(response.hasPrevious)
  };
}

export async function fetchAdminResidents({
  page = 1,
  pageSize = 25,
  query = "",
  includeArchived = false,
  status = ""
} = {}) {
  const searchParams = new URLSearchParams();
  const residentStatus = status || (includeArchived ? "all" : "active");

  searchParams.set("page", String(page));
  searchParams.set("pageSize", String(pageSize));

  if (query.trim()) {
    searchParams.set("search", query.trim());
  }

  searchParams.set("status", residentStatus);
  searchParams.set("showArchived", String(residentStatus === "all"));
  searchParams.set("archived", String(residentStatus === "archived"));

  const data = await apiFetch(`/api/admin/residents?${searchParams.toString()}`);

  return mapApiAdminResidentListResponse(data);
}

export async function createAdminResident(resident) {
  const data = await apiFetch("/api/admin/residents", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      id: resident.id,
      householdId: resident.householdId,
      fullName: resident.fullName,
      gender: resident.gender,
      address: resident.address,
      exactAddress: resident.exactAddress,
      sitio: resident.sitio,
      precinctNumber: resident.precinctNumber,
      contactNumber: resident.contactNumber,
      birthDate: resident.birthDate,
      civilStatus: resident.civilStatus,
      occupation: resident.occupation,
      sectors: resident.sectors ?? [],
      statusColor: resident.statusColor ?? resident.status ?? "green",
      additionalInformation: resident.additionalInformation
    })
  });

  return {
    resident: mapApiAdminResidentToResident(data.resident),
    warnings: data.warnings ?? []
  };
}

export async function updateAdminResident(residentId, resident) {
  const data = await apiFetch(`/api/admin/residents/${encodeURIComponent(residentId)}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      fullName: resident.fullName,
      address: resident.address,
      exactAddress: resident.exactAddress,
      precinctNumber: resident.precinctNumber,
      birthDate: resident.birthDate,
      civilStatus: resident.civilStatus,
      occupation: resident.occupation,
      contactNumber: resident.contactNumber,
      sitio: resident.sitio,
      additionalInformation: resident.additionalInformation
    })
  });

  return mapApiAdminResidentToResident(data.resident);
}

export async function archiveAdminResident(residentId) {
  const data = await apiFetch(`/api/admin/residents/${encodeURIComponent(residentId)}/archive`, {
    method: "POST"
  });

  return mapApiAdminResidentToResident(data.resident);
}

export async function restoreAdminResident(residentId) {
  const data = await apiFetch(`/api/admin/residents/${encodeURIComponent(residentId)}/restore`, {
    method: "POST"
  });

  return mapApiAdminResidentToResident(data.resident);
}
