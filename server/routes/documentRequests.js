import { Router } from "express";
import { writeAuditLog } from "../lib/audit.js";
import { createId } from "../lib/ids.js";
import { toDocumentRequestResponse } from "../lib/responseMappers.js";
import { requireFields, validateDocumentRequestStatus } from "../lib/validation.js";
import { requireRole } from "../middleware/roles.js";

const ARCHIVE_REASONS = new Set([
  "Duplicate request",
  "Wrong resident",
  "Wrong document type",
  "Created by mistake",
  "Other"
]);

const transitionRules = {
  processing: new Set(["pending"]),
  released: new Set(["pending", "processing"])
};

function normalizeText(value) {
  return String(value ?? "").trim();
}

function normalizeNullableDate(value) {
  const normalized = normalizeText(value);
  return normalized || null;
}

function isIsoDate(value) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function validateCreatePayload(body) {
  const errors = [];
  const payload = {
    residentId: normalizeText(body.residentId),
    barangayDocumentId: normalizeText(body.barangayDocumentId),
    customDocumentTitle: normalizeText(body.customDocumentTitle),
    purpose: normalizeText(body.purpose),
    requestDate: normalizeNullableDate(body.requestDate),
    releaseDate: normalizeNullableDate(body.releaseDate),
    expiryDate: normalizeNullableDate(body.expiryDate),
    status: normalizeText(body.status || "pending")
  };

  if (!payload.requestDate) {
    errors.push("Request date is required.");
  } else if (!isIsoDate(payload.requestDate)) {
    errors.push("Request date must use YYYY-MM-DD format.");
  }

  if (payload.releaseDate && !isIsoDate(payload.releaseDate)) {
    errors.push("Release date must use YYYY-MM-DD format.");
  }

  if (payload.expiryDate && !isIsoDate(payload.expiryDate)) {
    errors.push("Expiry date must use YYYY-MM-DD format.");
  }

  if (payload.barangayDocumentId === "BDOC-OTHER" && !payload.customDocumentTitle) {
    errors.push("Custom document title is required for Other requests.");
  }

  if (payload.releaseDate && payload.requestDate && payload.releaseDate < payload.requestDate) {
    errors.push("Release date cannot be before request date.");
  }

  if (payload.expiryDate && payload.requestDate && payload.expiryDate < payload.requestDate) {
    errors.push("Expiry date cannot be before request date.");
  }

  if (payload.releaseDate && payload.expiryDate && payload.expiryDate < payload.releaseDate) {
    errors.push("Expiry date cannot be before release date.");
  }

  return {
    errors,
    payload: {
      ...payload,
      customDocumentTitle:
        payload.barangayDocumentId === "BDOC-OTHER" ? payload.customDocumentTitle : null
    }
  };
}

const documentRequestSelect = `
  SELECT
    requests.id,
    requests.resident_id,
    residents.full_name AS resident_name,
    requests.barangay_document_id,
    documents.name AS barangay_document_name,
    requests.custom_document_title,
    requests.purpose,
    requests.status,
    requests.request_date,
    requests.release_date,
    requests.expiry_date,
    requests.processed_by_profile_id,
    profiles.display_name AS processed_by_name,
    requests.archived_at,
    requests.archived_by_profile_id,
    requests.archive_reason,
    requests.archive_note,
    requests.created_at,
    requests.updated_at
  FROM document_requests requests
  INNER JOIN barangay_documents documents ON documents.id = requests.barangay_document_id
  INNER JOIN residents ON residents.id = requests.resident_id
  LEFT JOIN profiles ON profiles.id = requests.processed_by_profile_id`;

export function createDocumentRequestsRouter(pool) {
  const router = Router();

  router.get("/", requireRole("admin", "department", "lupon"), async (_req, res, next) => {
    try {
      const result = await pool.query(
        `${documentRequestSelect}
        WHERE requests.archived_at IS NULL
        ORDER BY requests.request_date DESC`
      );

      res.json({ documentRequests: result.rows.map(toDocumentRequestResponse) });
    } catch (error) {
      next(error);
    }
  });

  router.post("/", requireRole("admin", "department"), async (req, res, next) => {
    try {
      const missingFields = requireFields(req.body, [
        "residentId",
        "barangayDocumentId",
        "purpose",
        "requestDate"
      ]);

      if (missingFields.length > 0) {
        return res.status(400).json({ error: "Missing required fields.", fields: missingFields });
      }

      const { errors, payload } = validateCreatePayload(req.body);

      if (errors.length > 0) {
        return res.status(422).json({ error: errors[0], errors });
      }

      const status = payload.status;

      if (!validateDocumentRequestStatus(status)) {
        return res.status(400).json({ error: "Invalid document request status." });
      }

      const result = await pool.query(
        `WITH inserted AS (
          INSERT INTO document_requests (
            id,
            resident_id,
            barangay_document_id,
            custom_document_title,
            purpose,
            status,
            request_date,
            release_date,
            expiry_date,
            processed_by_profile_id
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
          RETURNING
            id,
            resident_id,
            barangay_document_id,
            custom_document_title,
            purpose,
            status,
            request_date,
            release_date,
            expiry_date,
            processed_by_profile_id,
            created_at,
            updated_at
        )
        SELECT
          inserted.id,
          inserted.resident_id,
          residents.full_name AS resident_name,
          inserted.barangay_document_id,
          documents.name AS barangay_document_name,
          inserted.custom_document_title,
          inserted.purpose,
          inserted.status,
          inserted.request_date,
          inserted.release_date,
          inserted.expiry_date,
          inserted.processed_by_profile_id,
          profiles.display_name AS processed_by_name,
          NULL::timestamptz AS archived_at,
          NULL::text AS archived_by_profile_id,
          NULL::text AS archive_reason,
          NULL::text AS archive_note,
          inserted.created_at,
          inserted.updated_at
        FROM inserted
        INNER JOIN barangay_documents documents ON documents.id = inserted.barangay_document_id
        INNER JOIN residents ON residents.id = inserted.resident_id
        LEFT JOIN profiles ON profiles.id = inserted.processed_by_profile_id`,
        [
          req.body.id ?? createId("DOC"),
          payload.residentId,
          payload.barangayDocumentId,
          payload.customDocumentTitle,
          payload.purpose,
          status,
          payload.requestDate,
          payload.releaseDate,
          payload.expiryDate,
          req.user.profileId
        ]
      );

      const documentRequest = result.rows[0];

      await writeAuditLog(pool, {
        actor: req.user,
        action: "document_request.created",
        targetType: "document_request",
        targetId: documentRequest.id,
        metadata: {
          residentId: documentRequest.resident_id,
          barangayDocumentId: documentRequest.barangay_document_id,
          status: documentRequest.status
        }
      });

      return res.status(201).json({
        documentRequest: toDocumentRequestResponse(documentRequest)
      });
    } catch (error) {
      return next(error);
    }
  });

  async function getActiveRequest(requestId) {
    const result = await pool.query(
      `SELECT id, status, release_date, archived_at
       FROM document_requests
       WHERE id = $1`,
      [requestId]
    );

    return result.rows[0] ?? null;
  }

  function validateTransition(request, nextStatus) {
    if (!request || request.archived_at) {
      return "Document request was not found.";
    }

    if (!transitionRules[nextStatus]?.has(request.status)) {
      return "Invalid document request status transition.";
    }

    return "";
  }

  async function writeStatusEvent({ actor, requestId, previousStatus, nextStatus, note }) {
    await pool.query(
      `INSERT INTO document_request_events (
        id,
        document_request_id,
        previous_status,
        new_status,
        note,
        created_by_profile_id
      )
      VALUES ($1, $2, $3, $4, $5, $6)`,
      [createId("DRE"), requestId, previousStatus, nextStatus, note, actor.profileId]
    );
  }

  async function updateStatus({ req, res, nextStatus }) {
    const documentRequest = await getActiveRequest(req.params.id);
    const transitionError = validateTransition(documentRequest, nextStatus);

    if (transitionError) {
      return res.status(transitionError.includes("not found") ? 404 : 409).json({
        error: transitionError
      });
    }

    const releaseDateExpression =
      nextStatus === "released" ? "release_date = COALESCE(release_date, CURRENT_DATE)," : "";

    const result = await pool.query(
      `WITH updated AS (
        UPDATE document_requests
        SET
          status = $2,
          ${releaseDateExpression}
          processed_by_profile_id = $3,
          updated_at = now()
        WHERE id = $1
          AND archived_at IS NULL
        RETURNING
          id,
          resident_id,
          barangay_document_id,
          custom_document_title,
          purpose,
          status,
          request_date,
          release_date,
          expiry_date,
          processed_by_profile_id,
          archived_at,
          archived_by_profile_id,
          archive_reason,
          archive_note,
          created_at,
          updated_at
      )
      SELECT
        updated.id,
        updated.resident_id,
        residents.full_name AS resident_name,
        updated.barangay_document_id,
        documents.name AS barangay_document_name,
        updated.custom_document_title,
        updated.purpose,
        updated.status,
        updated.request_date,
        updated.release_date,
        updated.expiry_date,
        updated.processed_by_profile_id,
        profiles.display_name AS processed_by_name,
        updated.archived_at,
        updated.archived_by_profile_id,
        updated.archive_reason,
        updated.archive_note,
        updated.created_at,
        updated.updated_at
      FROM updated
      INNER JOIN barangay_documents documents ON documents.id = updated.barangay_document_id
      INNER JOIN residents ON residents.id = updated.resident_id
      LEFT JOIN profiles ON profiles.id = updated.processed_by_profile_id`,
      [req.params.id, nextStatus, req.user.profileId]
    );

    await writeStatusEvent({
      actor: req.user,
      requestId: req.params.id,
      previousStatus: documentRequest.status,
      nextStatus,
      note: nextStatus === "released" ? "Marked released by Department." : "Marked processing by Department."
    });

    await writeAuditLog(pool, {
      actor: req.user,
      action: `document_request.${nextStatus}`,
      targetType: "document_request",
      targetId: req.params.id,
      metadata: {
        previousStatus: documentRequest.status,
        status: nextStatus
      }
    });

    return res.json({ documentRequest: toDocumentRequestResponse(result.rows[0]) });
  }

  router.post("/:id/mark-processing", requireRole("admin", "department"), async (req, res, next) => {
    try {
      return await updateStatus({ req, res, nextStatus: "processing" });
    } catch (error) {
      return next(error);
    }
  });

  router.post("/:id/mark-released", requireRole("admin", "department"), async (req, res, next) => {
    try {
      return await updateStatus({ req, res, nextStatus: "released" });
    } catch (error) {
      return next(error);
    }
  });

  router.post("/:id/archive", requireRole("admin", "department"), async (req, res, next) => {
    try {
      const reason = String(req.body.reason ?? "").trim();
      const note = String(req.body.note ?? "").trim();

      if (!ARCHIVE_REASONS.has(reason)) {
        return res.status(400).json({ error: "A valid archive reason is required." });
      }

      const documentRequest = await getActiveRequest(req.params.id);

      if (!documentRequest || documentRequest.archived_at) {
        return res.status(404).json({ error: "Document request was not found." });
      }

      const result = await pool.query(
        `WITH updated AS (
          UPDATE document_requests
          SET
            archived_at = now(),
            archived_by_profile_id = $2,
            archive_reason = $3,
            archive_note = $4,
            updated_at = now()
          WHERE id = $1
            AND archived_at IS NULL
          RETURNING
            id,
            resident_id,
            barangay_document_id,
            custom_document_title,
            purpose,
            status,
            request_date,
            release_date,
            expiry_date,
            processed_by_profile_id,
            archived_at,
            archived_by_profile_id,
            archive_reason,
            archive_note,
            created_at,
            updated_at
        )
        SELECT
          updated.id,
          updated.resident_id,
          residents.full_name AS resident_name,
          updated.barangay_document_id,
          documents.name AS barangay_document_name,
          updated.custom_document_title,
          updated.purpose,
          updated.status,
          updated.request_date,
          updated.release_date,
          updated.expiry_date,
          updated.processed_by_profile_id,
          profiles.display_name AS processed_by_name,
          updated.archived_at,
          updated.archived_by_profile_id,
          updated.archive_reason,
          updated.archive_note,
          updated.created_at,
          updated.updated_at
        FROM updated
        INNER JOIN barangay_documents documents ON documents.id = updated.barangay_document_id
        INNER JOIN residents ON residents.id = updated.resident_id
        LEFT JOIN profiles ON profiles.id = updated.processed_by_profile_id`,
        [req.params.id, req.user.profileId, reason, note || null]
      );

      await writeAuditLog(pool, {
        actor: req.user,
        action: "document_request.archived",
        targetType: "document_request",
        targetId: req.params.id,
        metadata: {
          status: documentRequest.status,
          reason
        }
      });

      return res.json({ documentRequest: toDocumentRequestResponse(result.rows[0]) });
    } catch (error) {
      return next(error);
    }
  });

  return router;
}
