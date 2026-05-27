import { createReadStream } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import { isAbsolute, join, relative, resolve } from "node:path";
import { Router, raw } from "express";
import { writeAuditLog } from "../lib/audit.js";
import { createId } from "../lib/ids.js";
import {
  canListResidentDocument,
  canUploadResidentDocument,
  canViewResidentDocument,
  getResidentDocumentMaxBytes,
  getStoredFilename,
  isDocumentTitleRequired,
  isSupportedResidentDocumentUpload,
  normalizeDocumentTitle,
  normalizeDocumentType,
  normalizeVisibilityScope,
  sanitizeOriginalFilename,
  toResidentDocumentMetadata
} from "../lib/residentDocuments.js";
import { requireRole } from "../middleware/roles.js";

function getBaseContentType(req) {
  return String(req.get("content-type") ?? "")
    .split(";")[0]
    .trim()
    .toLowerCase();
}

function getHeaderValue(req, headerName) {
  const value = String(req.get(headerName) ?? "").trim();

  if (!value) {
    return "";
  }

  try {
    return decodeURIComponent(value);
  } catch (_error) {
    return value;
  }
}

function getUploadRoot() {
  return resolve(process.env.RESIDENT_DOCUMENT_UPLOAD_ROOT || "uploads");
}

function getRelativeStoragePath(residentId, storedFilename) {
  return join("resident-documents", residentId, storedFilename);
}

function getAbsoluteStoragePath(storagePath) {
  const uploadRoot = getUploadRoot();
  const absolutePath = resolve(uploadRoot, storagePath);
  const relativePath = relative(uploadRoot, absolutePath);

  if (!relativePath || relativePath.startsWith("..") || isAbsolute(relativePath)) {
    const error = new Error("Invalid document storage path.");
    error.status = 500;
    throw error;
  }

  return absolutePath;
}

async function ensureResidentExists(pool, residentId) {
  const result = await pool.query(
    `SELECT id
    FROM residents
    WHERE id = $1
      AND archived_at IS NULL`,
    [residentId]
  );

  return result.rowCount > 0;
}

async function loadResidentDocument(pool, documentId) {
  const result = await pool.query(
    `SELECT
      documents.id,
      documents.resident_id,
      documents.uploaded_by_profile_id,
      profiles.display_name AS uploaded_by_name,
      documents.document_type,
      documents.document_title,
      documents.original_filename,
      documents.stored_filename,
      documents.mime_type,
      documents.file_size_bytes,
      documents.storage_path,
      documents.visibility_scope,
      documents.linked_case_id,
      documents.created_at,
      documents.archived_at
    FROM resident_documents documents
    LEFT JOIN profiles ON profiles.id = documents.uploaded_by_profile_id
    WHERE documents.id = $1`,
    [documentId]
  );

  return result.rows[0] ?? null;
}

export function createResidentDocumentCollectionRouter(pool) {
  const router = Router({ mergeParams: true });
  const uploadBody = raw({
    limit: `${getResidentDocumentMaxBytes()}b`,
    type: "*/*"
  });

  router.get(
    "/",
    requireRole("admin", "department", "lupon"),
    async (req, res, next) => {
      try {
        const residentExists = await ensureResidentExists(pool, req.params.residentId);

        if (!residentExists) {
          return res.status(404).json({ error: "Resident not found." });
        }

        const result = await pool.query(
          `SELECT
            documents.id,
            documents.resident_id,
            documents.uploaded_by_profile_id,
            profiles.display_name AS uploaded_by_name,
            documents.document_type,
            documents.document_title,
            documents.original_filename,
            documents.mime_type,
            documents.file_size_bytes,
            documents.visibility_scope,
            documents.linked_case_id,
            documents.created_at,
            documents.archived_at
          FROM resident_documents documents
          LEFT JOIN profiles ON profiles.id = documents.uploaded_by_profile_id
          WHERE documents.resident_id = $1
            AND documents.archived_at IS NULL
          ORDER BY documents.created_at DESC`,
          [req.params.residentId]
        );

        const documents = result.rows
          .filter((document) => canListResidentDocument(req.user, document))
          .map(toResidentDocumentMetadata);

        return res.json({ documents });
      } catch (error) {
        return next(error);
      }
    }
  );

  router.post(
    "/",
    requireRole("department", "lupon"),
    uploadBody,
    async (req, res, next) => {
      const originalFilename = sanitizeOriginalFilename(getHeaderValue(req, "x-file-name"));
      const documentType = normalizeDocumentType(getHeaderValue(req, "x-document-type"));
      const documentTitle = normalizeDocumentTitle(getHeaderValue(req, "x-document-title"));
      const visibilityScope = normalizeVisibilityScope(
        getHeaderValue(req, "x-visibility-scope"),
        req.user.role
      );
      const linkedCaseId = getHeaderValue(req, "x-linked-case-id") || null;
      const mimeType = getBaseContentType(req);
      const fileBuffer = Buffer.isBuffer(req.body) ? req.body : Buffer.alloc(0);

      if (!documentType) {
        return res.status(400).json({ error: "Document type is required." });
      }

      if (isDocumentTitleRequired(documentType) && !documentTitle) {
        return res.status(400).json({ error: "Document title is required for Other documents." });
      }

      if (!fileBuffer.length) {
        return res.status(400).json({ error: "A document file is required." });
      }

      if (fileBuffer.length > getResidentDocumentMaxBytes()) {
        return res.status(413).json({ error: "Document file is too large." });
      }

      if (!isSupportedResidentDocumentUpload({ fileBuffer, mimeType, originalFilename })) {
        return res.status(415).json({ error: "Only PDF, JPG, JPEG, and PNG documents are supported." });
      }

      if (!canUploadResidentDocument(req.user, { visibilityScope, linkedCaseId })) {
        return res.status(403).json({ error: "This role is not allowed to upload that document scope." });
      }

      try {
        const residentExists = await ensureResidentExists(pool, req.params.residentId);

        if (!residentExists) {
          return res.status(404).json({ error: "Resident not found." });
        }

        const documentId = createId("RDOC");
        const storedFilename = getStoredFilename({ documentId, mimeType });
        const storagePath = getRelativeStoragePath(req.params.residentId, storedFilename);
        const absolutePath = getAbsoluteStoragePath(storagePath);

        await mkdir(resolve(absolutePath, ".."), { recursive: true });
        await writeFile(absolutePath, fileBuffer, { flag: "wx" });

        const insertResult = await pool.query(
          `INSERT INTO resident_documents (
            id,
            resident_id,
            uploaded_by_profile_id,
            document_type,
            document_title,
            original_filename,
            stored_filename,
            mime_type,
            file_size_bytes,
            storage_path,
            visibility_scope,
            linked_case_id
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
          RETURNING
            id,
            resident_id,
            uploaded_by_profile_id,
            NULL AS uploaded_by_name,
            document_type,
            document_title,
            original_filename,
            stored_filename,
            mime_type,
            file_size_bytes,
            storage_path,
            visibility_scope,
            linked_case_id,
            created_at,
            archived_at`,
          [
            documentId,
            req.params.residentId,
            req.user.profileId,
            documentType,
            documentTitle || null,
            originalFilename,
            storedFilename,
            mimeType,
            fileBuffer.length,
            storagePath,
            visibilityScope,
            linkedCaseId
          ]
        );

        await writeAuditLog(pool, {
          actor: req.user,
          action: "resident_document.uploaded",
          targetType: "resident_document",
          targetId: documentId,
          metadata: {
            residentId: req.params.residentId,
            documentType,
            visibilityScope,
            linkedCaseId,
            mimeType,
            fileSizeBytes: fileBuffer.length
          }
        });

        return res.status(201).json({
          document: toResidentDocumentMetadata(insertResult.rows[0])
        });
      } catch (error) {
        return next(error);
      }
    }
  );

  return router;
}

export function createResidentDocumentFilesRouter(pool) {
  const router = Router({ mergeParams: true });

  router.get(
    "/",
    requireRole("admin", "department", "lupon"),
    async (req, res, next) => {
      try {
        const document = await loadResidentDocument(pool, req.params.documentId);

        if (!document || document.archived_at) {
          return res.status(404).json({ error: "Document not found." });
        }

        if (!canListResidentDocument(req.user, document)) {
          return res.status(404).json({ error: "Document not found." });
        }

        if (!canViewResidentDocument(req.user, document)) {
          return res.status(403).json({ error: "This role can only view document metadata." });
        }

        res.setHeader("Content-Type", document.mime_type);
        res.setHeader(
          "Content-Disposition",
          `inline; filename="${sanitizeOriginalFilename(document.original_filename).replace(/"/g, "")}"`
        );

        return createReadStream(getAbsoluteStoragePath(document.storage_path))
          .on("error", next)
          .pipe(res);
      } catch (error) {
        return next(error);
      }
    }
  );

  router.post(
    "/archive",
    requireRole("department", "lupon"),
    async (req, res, next) => {
      try {
        const document = await loadResidentDocument(pool, req.params.documentId);

        if (!document || document.archived_at) {
          return res.status(404).json({ error: "Document not found." });
        }

        if (!canViewResidentDocument(req.user, document)) {
          return res.status(404).json({ error: "Document not found." });
        }

        const result = await pool.query(
          `UPDATE resident_documents
          SET archived_at = now()
          WHERE id = $1
            AND archived_at IS NULL
          RETURNING
            id,
            resident_id,
            uploaded_by_profile_id,
            NULL AS uploaded_by_name,
            document_type,
            document_title,
            original_filename,
            mime_type,
            file_size_bytes,
            visibility_scope,
            linked_case_id,
            created_at,
            archived_at`,
          [req.params.documentId]
        );

        await writeAuditLog(pool, {
          actor: req.user,
          action: "resident_document.archived",
          targetType: "resident_document",
          targetId: req.params.documentId,
          metadata: {
            residentId: document.resident_id,
            documentType: document.document_type,
            documentTitle: document.document_title,
            visibilityScope: document.visibility_scope,
            linkedCaseId: document.linked_case_id
          }
        });

        return res.json({ document: toResidentDocumentMetadata(result.rows[0]) });
      } catch (error) {
        return next(error);
      }
    }
  );

  return router;
}
