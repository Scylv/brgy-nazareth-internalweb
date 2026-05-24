import { apiFetch } from "../../../shared/api/client";

export function mapApiResidentToResident(apiResident) {
  return {
    id: apiResident.id,
    householdId: apiResident.householdId,
    name: apiResident.name ?? apiResident.fullName,
    fullName: apiResident.fullName ?? apiResident.name,
    birthDate: apiResident.birthDate,
    gender: apiResident.gender,
    civilStatus: apiResident.civilStatus,
    occupation: apiResident.occupation,
    address: apiResident.address,
    contactNumber: apiResident.contactNumber,
    email: apiResident.email,
    additionalInformation: apiResident.additionalInformation,
    sectors: Array.isArray(apiResident.sectors) ? apiResident.sectors : [],
    registeredVoter: Boolean(apiResident.registeredVoter),
    precinctNumber: apiResident.precinctNumber ?? "",
    status: apiResident.status ?? apiResident.statusColor,
    statusColor: apiResident.statusColor ?? apiResident.status,
    createdAt: apiResident.createdAt,
    updatedAt: apiResident.updatedAt,
    documents: Array.isArray(apiResident.documents) ? apiResident.documents : []
  };
}

export async function fetchResidents() {
  const data = await apiFetch("/api/residents");

  return (data.residents ?? []).map(mapApiResidentToResident);
}

function toResidentUpdatePayload(resident) {
  return {
    householdId: resident.householdId,
    fullName: resident.fullName ?? resident.name,
    birthDate: resident.birthDate,
    gender: resident.gender,
    civilStatus: resident.civilStatus,
    occupation: resident.occupation,
    address: resident.address,
    contactNumber: resident.contactNumber,
    email: resident.email,
    additionalInformation: resident.additionalInformation,
    sectors: resident.sectors,
    registeredVoter: resident.registeredVoter,
    precinctNumber: resident.precinctNumber,
    status: resident.status ?? resident.statusColor
  };
}

export async function updateResident(residentId, resident) {
  const data = await apiFetch(`/api/residents/${encodeURIComponent(residentId)}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(toResidentUpdatePayload(resident))
  });

  return mapApiResidentToResident(data.resident);
}
