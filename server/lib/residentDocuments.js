import { extname } from "node:path";

export const RESIDENT_DOCUMENT_VISIBILITY_SCOPES = [
  "department_visible",
  "general_internal",
  "lupon_confidential",
  "admin_only"
];

export const RESIDENT_DOCUMENT_MIME_TYPES = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png"
]);

const SAFE_EXTENSION_BY_MIME_TYPE = {
  "application/pdf": ".pdf",
  "image/jpeg": ".jpg",
  "image/png": ".png"
};
const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

export function getResidentDocumentMaxBytes() {
  const configured = Number(process.env.RESIDENT_DOCUMENT_MAX_BYTES);

  return Number.isInteger(configured) && configured > 0 ? configured : 10 * 1024 * 1024;
}

export function sanitizeOriginalFilename(filename) {
  const clean = String(filename ?? "")
    .replace(/[\\/]+/g, " ")
    .replace(/\.\.+/g, "")
    .replace(/[^\w\s().-]/g, "")
    .replace(/\s+/g, " ")
    .trim();

  return clean || "resident-document";
}

export function getStoredFilename({ documentId, mimeType }) {
  const extension = SAFE_EXTENSION_BY_MIME_TYPE[mimeType] ?? ".bin";

  return `${documentId}${extension}`;
}

export function normalizeDocumentType(value) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

export function normalizeVisibilityScope(value, role) {
  const scope = String(value ?? "").trim();

  if (RESIDENT_DOCUMENT_VISIBILITY_SCOPES.includes(scope)) {
    return scope;
  }

  return role === "department" ? "department_visible" : "general_internal";
}

export function canListResidentDocument(user, document) {
  if (!user || !document || document.archived_at) {
    return false;
  }

  if (user.role === "department") {
    return (
      ["department_visible", "general_internal"].includes(document.visibility_scope) &&
      !document.linked_case_id
    );
  }

  if (user.role === "lupon") {
    return ["department_visible", "general_internal", "lupon_confidential"].includes(
      document.visibility_scope
    );
  }

  return user.role === "admin";
}

export function canViewResidentDocument(user, document) {
  if (!canListResidentDocument(user, document)) {
    return false;
  }

  if (user.role === "admin") {
    return false;
  }

  return true;
}

export function canUploadResidentDocument(user, { visibilityScope, linkedCaseId }) {
  if (!user) {
    return false;
  }

  if (user.role === "department") {
    return (
      ["department_visible", "general_internal"].includes(visibilityScope) &&
      !linkedCaseId
    );
  }

  if (user.role === "lupon") {
    return ["department_visible", "general_internal", "lupon_confidential"].includes(
      visibilityScope
    );
  }

  return false;
}

function hasExpectedFileSignature({ fileBuffer, mimeType }) {
  if (!Buffer.isBuffer(fileBuffer)) {
    return false;
  }

  if (mimeType === "application/pdf") {
    return fileBuffer.subarray(0, 5).equals(Buffer.from("%PDF-"));
  }

  if (mimeType === "image/png") {
    return fileBuffer.subarray(0, PNG_SIGNATURE.length).equals(PNG_SIGNATURE);
  }

  if (mimeType === "image/jpeg") {
    return fileBuffer[0] === 0xff && fileBuffer[1] === 0xd8 && fileBuffer[2] === 0xff;
  }

  return false;
}

export function isSupportedResidentDocumentUpload({ fileBuffer, mimeType, originalFilename }) {
  if (!RESIDENT_DOCUMENT_MIME_TYPES.has(mimeType)) {
    return false;
  }

  const extension = extname(sanitizeOriginalFilename(originalFilename)).toLowerCase();

  if (mimeType === "application/pdf") {
    return extension === ".pdf" && hasExpectedFileSignature({ fileBuffer, mimeType });
  }

  if (mimeType === "image/png") {
    return extension === ".png" && hasExpectedFileSignature({ fileBuffer, mimeType });
  }

  return [".jpg", ".jpeg"].includes(extension) && hasExpectedFileSignature({ fileBuffer, mimeType });
}

export function toResidentDocumentMetadata(row) {
  return {
    id: row.id,
    residentId: row.resident_id,
    uploadedByProfileId: row.uploaded_by_profile_id,
    uploadedByName: row.uploaded_by_name ?? null,
    documentType: row.document_type,
    originalFilename: row.original_filename,
    mimeType: row.mime_type,
    fileSizeBytes: Number(row.file_size_bytes ?? 0),
    visibilityScope: row.visibility_scope,
    linkedCaseId: row.linked_case_id,
    createdAt: row.created_at,
    archivedAt: row.archived_at
  };
}
