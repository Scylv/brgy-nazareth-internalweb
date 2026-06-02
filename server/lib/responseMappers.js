function isRow(row) {
  return row !== null && typeof row === "object" && !Array.isArray(row);
}

export function toDepartmentResidentResponse(row) {
  if (!isRow(row)) {
    return null;
  }

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

export function toAdminResidentResponse(row) {
  if (!isRow(row)) {
    return null;
  }

  return {
    id: row.id,
    householdId: row.household_id,
    fullName: row.full_name,
    birthDate: row.birth_date,
    gender: row.gender,
    civilStatus: row.civil_status,
    occupation: row.occupation,
    address: row.address,
    exactAddress: row.exact_address,
    contactNumber: row.contact_number,
    additionalInformation: row.additional_information,
    sectors: row.sectors,
    registeredVoter: row.registered_voter,
    precinctNumber: row.precinct_number,
    sitio: row.sitio,
    statusColor: row.status_color,
    archived: Boolean(row.archived_at),
    archivedAt: row.archived_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

export function toDocumentRequestResponse(row) {
  if (!isRow(row)) {
    return null;
  }

  const response = {
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

  if (row.resident_name !== undefined) {
    response.residentName = row.resident_name;
  }

  if (row.custom_document_title !== undefined) {
    response.customDocumentTitle = row.custom_document_title;
  }

  if (row.archived_at !== undefined) {
    response.archived = Boolean(row.archived_at);
    response.archivedAt = row.archived_at;
    response.archivedByProfileId = row.archived_by_profile_id;
    response.archiveReason = row.archive_reason;
    response.archiveNote = row.archive_note;
  }

  return response;
}

export function toLuponCaseResponse(row) {
  if (!isRow(row)) {
    return null;
  }

  return {
    id: row.id,
    residentId: row.resident_id,
    caseNumber: row.case_number,
    caseTitle: row.case_title ?? row.case_type,
    caseType: row.case_type,
    status: row.status,
    priority: row.priority,
    confidentialSummary: row.confidential_summary,
    openedAt: row.opened_at,
    resolvedAt: row.resolved_at,
    resolvedByProfileId: row.resolved_by_profile_id,
    assignedLuponProfileId: row.assigned_lupon_profile_id,
    createdByProfileId: row.created_by_profile_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

export function toLuponCaseNoteResponse(row) {
  if (!isRow(row)) {
    return null;
  }

  return {
    id: row.id,
    luponCaseId: row.lupon_case_id,
    noteType: row.note_type,
    noteBody: row.note_body,
    createdByProfileId: row.created_by_profile_id,
    createdAt: row.created_at
  };
}

export function toAdminProfileResponse(row) {
  if (!isRow(row)) {
    return null;
  }

  return {
    id: row.id,
    username: row.username,
    displayName: row.display_name,
    role: row.role,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}
