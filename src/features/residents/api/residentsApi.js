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
    remarks: apiResident.remarks ?? "",
    caseReason: apiResident.caseReason ?? "",
    documents: Array.isArray(apiResident.documents) ? apiResident.documents : []
  };
}

export async function fetchResidents() {
  const data = await apiFetch("/api/residents");

  return (data.residents ?? []).map(mapApiResidentToResident);
}
