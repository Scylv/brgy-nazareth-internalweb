import { apiFetch } from "../../../shared/api/client";

export function mapApiAdminResidentToResident(apiResident) {
  return {
    id: apiResident.id,
    householdId: apiResident.householdId,
    fullName: apiResident.fullName,
    name: apiResident.fullName,
    birthDate: apiResident.birthDate,
    civilStatus: apiResident.civilStatus,
    occupation: apiResident.occupation,
    address: apiResident.address,
    exactAddress: apiResident.exactAddress,
    precinctNumber: apiResident.precinctNumber ?? "",
    contactNumber: apiResident.contactNumber,
    sitio: apiResident.sitio,
    additionalInformation: apiResident.additionalInformation,
    archived: Boolean(apiResident.archived),
    archivedAt: apiResident.archivedAt,
    createdAt: apiResident.createdAt,
    updatedAt: apiResident.updatedAt
  };
}

export async function fetchAdminResidents({ query = "", includeArchived = false } = {}) {
  const searchParams = new URLSearchParams();

  if (query.trim()) {
    searchParams.set("q", query.trim());
  }

  if (includeArchived) {
    searchParams.set("includeArchived", "true");
  }

  const suffix = searchParams.toString() ? `?${searchParams.toString()}` : "";
  const data = await apiFetch(`/api/admin/residents${suffix}`);

  return (data.residents ?? []).map(mapApiAdminResidentToResident);
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
