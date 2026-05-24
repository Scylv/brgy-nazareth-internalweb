import { apiFetch } from "../../../shared/api/client";

export const barangayDocumentOptions = [
  { id: "BDOC-001", name: "Barangay Clearance" },
  { id: "BDOC-003", name: "Barangay Indigency" },
  { id: "BDOC-004", name: "Barangay ID" },
  { id: "BDOC-005", name: "Certificate of Residency" }
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

export function normalizeDocumentRequestStatus(status) {
  const normalizedStatus = String(status ?? "pending").trim().toLowerCase();

  if (documentRequestStatusOptions.includes(normalizedStatus)) {
    return normalizedStatus;
  }

  return "pending";
}

export function mapApiDocumentRequestToDocumentRequest(apiRequest) {
  return {
    id: apiRequest.id,
    residentId: apiRequest.residentId,
    barangayDocumentId: apiRequest.barangayDocumentId,
    documentType:
      apiRequest.barangayDocumentName ??
      getDocumentName(apiRequest.barangayDocumentId) ??
      apiRequest.documentType ??
      "",
    purpose: apiRequest.purpose ?? "",
    requestDate: formatDateInputValue(apiRequest.requestDate),
    releaseDate: formatDateInputValue(apiRequest.releaseDate),
    expiryDate: formatDateInputValue(apiRequest.expiryDate),
    status: normalizeDocumentRequestStatus(apiRequest.status),
    processedBy: apiRequest.processedByName ?? apiRequest.processedBy ?? "",
    processedByProfileId: apiRequest.processedByProfileId
  };
}

export function toDocumentRequestCreatePayload(request) {
  const barangayDocumentId = request.barangayDocumentId ?? getDocumentId(request.documentType);

  if (!barangayDocumentId) {
    throw new Error("Unknown barangay document type.");
  }

  return {
    residentId: request.residentId,
    barangayDocumentId,
    purpose: request.purpose,
    requestDate: request.requestDate,
    releaseDate: request.releaseDate || null,
    expiryDate: request.expiryDate || null,
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
