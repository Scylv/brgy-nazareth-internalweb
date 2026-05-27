import { apiFetch } from "../../../shared/api/client";

export const barangayDocumentOptions = [
  { id: "BDOC-001", name: "Barangay Clearance" },
  { id: "BDOC-003", name: "Barangay Indigency" },
  { id: "BDOC-004", name: "Barangay ID" },
  { id: "BDOC-005", name: "Certificate of Residency" },
  { id: "BDOC-OTHER", name: "Other" }
];

export const documentRequestStatusOptions = [
  "pending",
  "processing",
  "released",
  "cancelled",
  "expired"
];

function formatDateInputValue(date) {
  if (!date) {
    return "";
  }

  return String(date).slice(0, 10);
}

function getDocumentName(documentId) {
  return barangayDocumentOptions.find((document) => document.id === documentId)?.name;
}

function getDocumentId(documentType) {
  return barangayDocumentOptions.find((document) => document.name === documentType)?.id;
}

function normalizeNullableDate(date) {
  const value = String(date ?? "").trim();
  return value || null;
}

function validateCreateDates({ requestDate, releaseDate, expiryDate }) {
  if (!requestDate) {
    throw new Error("Request date is required.");
  }

  if (releaseDate && releaseDate < requestDate) {
    throw new Error("Release date cannot be before request date.");
  }

  if (expiryDate && expiryDate < requestDate) {
    throw new Error("Expiry date cannot be before request date.");
  }

  if (releaseDate && expiryDate && expiryDate < releaseDate) {
    throw new Error("Expiry date cannot be before release date.");
  }
}

export function normalizeDocumentRequestStatus(status) {
  const normalizedStatus = String(status ?? "pending").trim().toLowerCase();

  if (documentRequestStatusOptions.includes(normalizedStatus)) {
    return normalizedStatus;
  }

  return "pending";
}

export function mapApiDocumentRequestToDocumentRequest(apiRequest) {
  const documentType =
    apiRequest.barangayDocumentName ??
    getDocumentName(apiRequest.barangayDocumentId) ??
    apiRequest.documentType ??
    "";
  const customDocumentTitle = String(apiRequest.customDocumentTitle ?? "").trim();

  return {
    id: apiRequest.id,
    residentId: apiRequest.residentId,
    barangayDocumentId: apiRequest.barangayDocumentId,
    documentType,
    displayDocumentType:
      documentType === "Other" && customDocumentTitle ? `Other: ${customDocumentTitle}` : documentType,
    customDocumentTitle,
    residentName: apiRequest.residentName ?? "",
    purpose: apiRequest.purpose ?? "",
    requestDate: formatDateInputValue(apiRequest.requestDate),
    releaseDate: formatDateInputValue(apiRequest.releaseDate),
    expiryDate: formatDateInputValue(apiRequest.expiryDate),
    status: normalizeDocumentRequestStatus(apiRequest.status),
    processedBy: apiRequest.processedByName ?? apiRequest.processedBy ?? "",
    processedByProfileId: apiRequest.processedByProfileId,
    archived: Boolean(apiRequest.archived),
    archivedAt: apiRequest.archivedAt ?? "",
    archiveReason: apiRequest.archiveReason ?? "",
    archiveNote: apiRequest.archiveNote ?? ""
  };
}

export function toDocumentRequestCreatePayload(request) {
  const barangayDocumentId = request.barangayDocumentId ?? getDocumentId(request.documentType);
  const customDocumentTitle = String(request.customDocumentTitle ?? "").trim();
  const requestDate = normalizeNullableDate(request.requestDate);
  const releaseDate = normalizeNullableDate(request.releaseDate);
  const expiryDate = normalizeNullableDate(request.expiryDate);

  if (!barangayDocumentId) {
    throw new Error("Unknown barangay document type.");
  }

  if (!request.residentId) {
    throw new Error("Select a resident before creating a request.");
  }

  if (barangayDocumentId === "BDOC-OTHER" && !customDocumentTitle) {
    throw new Error("Custom document title is required for Other requests.");
  }

  validateCreateDates({ requestDate, releaseDate, expiryDate });

  return {
    residentId: String(request.residentId).trim(),
    barangayDocumentId,
    customDocumentTitle: barangayDocumentId === "BDOC-OTHER" ? customDocumentTitle : null,
    purpose: String(request.purpose ?? "").trim(),
    requestDate,
    releaseDate,
    expiryDate,
    status: normalizeDocumentRequestStatus(request.status)
  };
}

export async function fetchDocumentRequests() {
  const data = await apiFetch("/api/document-requests");

  return (data.documentRequests ?? []).map(mapApiDocumentRequestToDocumentRequest);
}

export async function createDocumentRequest(request) {
  const data = await apiFetch("/api/document-requests", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(toDocumentRequestCreatePayload(request))
  });

  return mapApiDocumentRequestToDocumentRequest(data.documentRequest);
}

export async function markDocumentRequestProcessing(requestId) {
  const data = await apiFetch(`/api/document-requests/${requestId}/mark-processing`, {
    method: "POST"
  });

  return mapApiDocumentRequestToDocumentRequest(data.documentRequest);
}

export async function markDocumentRequestReleased(requestId) {
  const data = await apiFetch(`/api/document-requests/${requestId}/mark-released`, {
    method: "POST"
  });

  return mapApiDocumentRequestToDocumentRequest(data.documentRequest);
}

export async function archiveDocumentRequest(requestId, { reason, note = "" }) {
  const data = await apiFetch(`/api/document-requests/${requestId}/archive`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ reason, note })
  });

  return mapApiDocumentRequestToDocumentRequest(data.documentRequest);
}
