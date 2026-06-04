import { ApiError, apiFetch, getApiBaseUrl } from "../../../shared/api/client";

function getResidentDocumentFileUrl(documentId) {
  return `${getApiBaseUrl()}/api/resident-documents/${encodeURIComponent(documentId)}`;
}

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
    viewUrl: getResidentDocumentFileUrl(id)
  };
}

async function parseDocumentFileError(response) {
  const contentType = response.headers.get("content-type") ?? "";

  if (contentType.includes("application/json")) {
    const body = await response.json();

    return {
      body,
      message:
        body && typeof body === "object" && "error" in body
          ? body.error
          : `Document could not be opened with status ${response.status}.`
    };
  }

  const body = await response.text();

  return {
    body,
    message: body || `Document could not be opened with status ${response.status}.`
  };
}

export async function fetchResidentDocumentFile(documentId) {
  let response;

  try {
    response = await fetch(getResidentDocumentFileUrl(documentId), {
      credentials: "include",
      headers: {
        Accept: "application/pdf,image/jpeg,image/png,*/*"
      }
    });
  } catch (error) {
    throw new ApiError("Network request failed while opening the document.", {
      body: { cause: error?.message ?? "fetch failed" }
    });
  }

  if (!response.ok) {
    const { body, message } = await parseDocumentFileError(response);

    throw new ApiError(message, {
      status: response.status,
      body
    });
  }

  return response.blob();
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
