import { apiFetch, getApiBaseUrl } from "../../../shared/api/client";

export function mapApiResidentDocumentToResidentDocument(apiDocument = {}) {
  const id = apiDocument.id ?? "";

  return {
    id,
    residentId: apiDocument.residentId ?? "",
    uploadedByProfileId: apiDocument.uploadedByProfileId ?? "",
    uploadedByName: apiDocument.uploadedByName ?? null,
    documentType: apiDocument.documentType ?? "",
    documentTitle: apiDocument.documentTitle ?? "",
    originalFilename: apiDocument.originalFilename ?? "",
    mimeType: apiDocument.mimeType ?? "",
    fileSizeBytes: Number(apiDocument.fileSizeBytes ?? 0),
    visibilityScope: apiDocument.visibilityScope ?? "",
    linkedCaseId: apiDocument.linkedCaseId ?? null,
    createdAt: apiDocument.createdAt ?? "",
    archivedAt: apiDocument.archivedAt ?? null,
    viewUrl: `${getApiBaseUrl()}/api/resident-documents/${encodeURIComponent(id)}`
  };
}

export async function fetchResidentDocuments(residentId) {
  const data = await apiFetch(`/api/residents/${encodeURIComponent(residentId)}/documents`);

  return (data.documents ?? []).map(mapApiResidentDocumentToResidentDocument);
}

export async function uploadResidentDocument(
  residentId,
  { documentTitle = "", documentType, file, linkedCaseId, visibilityScope }
) {
  const headers = {
    "Content-Type": file.type || "application/octet-stream",
    "X-Document-Type": encodeURIComponent(documentType),
    "X-File-Name": encodeURIComponent(file.name),
    "X-Visibility-Scope": visibilityScope
  };

  if (documentTitle.trim()) {
    headers["X-Document-Title"] = encodeURIComponent(documentTitle.trim());
  }

  if (linkedCaseId) {
    headers["X-Linked-Case-Id"] = encodeURIComponent(linkedCaseId);
  }

  const data = await apiFetch(`/api/residents/${encodeURIComponent(residentId)}/documents`, {
    method: "POST",
    headers,
    body: file
  });

  return mapApiResidentDocumentToResidentDocument(data.document);
}

export async function archiveResidentDocument(documentId) {
  const data = await apiFetch(`/api/resident-documents/${encodeURIComponent(documentId)}/archive`, {
    method: "POST"
  });

  return mapApiResidentDocumentToResidentDocument(data.document);
}
