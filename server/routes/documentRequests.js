import { Router } from "express";
import { createId } from "../lib/ids.js";
import { toDocumentRequestResponse } from "../lib/responseMappers.js";
import { requireFields, validateDocumentRequestStatus } from "../lib/validation.js";
import { requireRole } from "../middleware/roles.js";

export function createDocumentRequestsRouter(pool) {
  const router = Router();

  router.get("/", requireRole("admin", "department", "lupon"), async (_req, res, next) => {
    try {
      const result = await pool.query(
        `SELECT
          requests.id,
          requests.resident_id,
          requests.barangay_document_id,
          documents.name AS barangay_document_name,
          requests.purpose,
          requests.status,
          requests.request_date,
          requests.release_date,
          requests.expiry_date,
          requests.processed_by_profile_id,
          profiles.display_name AS processed_by_name,
          requests.created_at,
          requests.updated_at
        FROM document_requests requests
        INNER JOIN barangay_documents documents ON documents.id = requests.barangay_document_id
        LEFT JOIN profiles ON profiles.id = requests.processed_by_profile_id
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

      const status = req.body.status ?? "pending";

      if (!validateDocumentRequestStatus(status)) {
        return res.status(400).json({ error: "Invalid document request status." });
      }

      const result = await pool.query(
        `WITH inserted AS (
          INSERT INTO document_requests (
            id,
            resident_id,
            barangay_document_id,
            purpose,
            status,
            request_date,
            release_date,
            expiry_date,
            processed_by_profile_id
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
          RETURNING
            id,
            resident_id,
            barangay_document_id,
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
          inserted.barangay_document_id,
          documents.name AS barangay_document_name,
          inserted.purpose,
          inserted.status,
          inserted.request_date,
          inserted.release_date,
          inserted.expiry_date,
          inserted.processed_by_profile_id,
          profiles.display_name AS processed_by_name,
          inserted.created_at,
          inserted.updated_at
        FROM inserted
        INNER JOIN barangay_documents documents ON documents.id = inserted.barangay_document_id
        LEFT JOIN profiles ON profiles.id = inserted.processed_by_profile_id`,
        [
          req.body.id ?? createId("DOC"),
          req.body.residentId,
          req.body.barangayDocumentId,
          req.body.purpose,
          status,
          req.body.requestDate,
          req.body.releaseDate ?? null,
          req.body.expiryDate ?? null,
          req.user.profileId
        ]
      );

      return res.status(201).json({
        documentRequest: toDocumentRequestResponse(result.rows[0])
      });
    } catch (error) {
      return next(error);
    }
  });

  return router;
}
