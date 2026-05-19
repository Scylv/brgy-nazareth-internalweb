export function toResident(row) {
  return {
    id: row.id,
    householdId: row.household_id,
    fullName: row.full_name,
    birthDate: row.birth_date,
    gender: row.gender,
    civilStatus: row.civil_status,
    occupation: row.occupation,
    address: row.address,
    contactNumber: row.contact_number,
    email: row.email,
    additionalInformation: row.additional_information,
    sectors: row.sectors,
    registeredVoter: row.registered_voter,
    precinctNumber: row.precinct_number,
    statusColor: row.status_color,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

export function toDocumentRequest(row) {
  return {
    id: row.id,
    residentId: row.resident_id,
    barangayDocumentId: row.barangay_document_id,
    barangayDocumentName: row.barangay_document_name,
    purpose: row.purpose,
    status: row.status,
    requestDate: row.request_date,
    releaseDate: row.release_date,
    expiryDate: row.expiry_date,
    processedByProfileId: row.processed_by_profile_id,
    processedByName: row.processed_by_name,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

export function toLuponCase(row) {
  return {
    id: row.id,
    residentId: row.resident_id,
    caseNumber: row.case_number,
    caseType: row.case_type,
    status: row.status,
    priority: row.priority,
    confidentialSummary: row.confidential_summary,
    openedAt: row.opened_at,
    resolvedAt: row.resolved_at,
    assignedLuponProfileId: row.assigned_lupon_profile_id,
    createdByProfileId: row.created_by_profile_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

export function toLuponCaseNote(row) {
  return {
    id: row.id,
    luponCaseId: row.lupon_case_id,
    noteType: row.note_type,
    noteBody: row.note_body,
    createdByProfileId: row.created_by_profile_id,
    createdAt: row.created_at
  };
}
