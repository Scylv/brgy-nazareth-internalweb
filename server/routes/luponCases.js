import { Router } from "express";
import { writeAuditLog } from "../lib/audit.js";
import { createId } from "../lib/ids.js";
import {
  toLuponCaseNoteResponse,
  toLuponCaseResponse
} from "../lib/responseMappers.js";
import {
  requireFields,
  validateLuponCasePriority,
  validateLuponCaseStatus,
  validateLuponNoteType
} from "../lib/validation.js";
import { requireRole } from "../middleware/roles.js";

function normalizeText(value) {
  return String(value ?? "").trim().replace(/\s+/g, " ");
}

function getTodayDate() {
  return new Date().toISOString().slice(0, 10);
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

const luponCaseReturnFields = `id,
          resident_id,
          case_number,
          case_title,
          case_type,
          status,
          priority,
          confidential_summary,
          opened_at,
          resolved_at,
          resolved_by_profile_id,
          assigned_lupon_profile_id,
          created_by_profile_id,
          created_at,
          updated_at`;

export function createLuponCasesRouter(pool) {
  const router = Router();

  router.get("/cases", requireRole("lupon"), async (_req, res, next) => {
    try {
      const result = await pool.query(
        `SELECT
          ${luponCaseReturnFields}
        FROM lupon_cases
        ORDER BY opened_at DESC`
      );

      res.json({ luponCases: result.rows.map(toLuponCaseResponse) });
    } catch (error) {
      next(error);
    }
  });

  router.post("/cases", requireRole("lupon"), async (req, res, next) => {
    try {
      const missingFields = requireFields(req.body, ["residentId", "confidentialSummary"]);

      if (missingFields.length > 0) {
        return res.status(400).json({ error: "Missing required fields.", fields: missingFields });
      }

      const residentId = normalizeText(req.body.residentId);
      const caseType = normalizeText(req.body.caseType) || "Resident Record Case";
      const caseTitle = normalizeText(req.body.caseTitle || req.body.caseSubject || caseType);
      const confidentialSummary = normalizeText(req.body.confidentialSummary);
      const openedAt = req.body.openedAt || getTodayDate();
      const status = req.body.status ?? "open";
      const priority = req.body.priority ?? "normal";

      if (!caseTitle) {
        return res.status(400).json({ error: "Case title is required." });
      }

      if (!validateLuponCaseStatus(status)) {
        return res.status(400).json({ error: "Invalid Lupon case status." });
      }

      if (!validateLuponCasePriority(priority)) {
        return res.status(400).json({ error: "Invalid Lupon case priority." });
      }

      if (!(await ensureResidentExists(pool, residentId))) {
        return res.status(404).json({ error: "Resident not found." });
      }

      const result = await pool.query(
        `INSERT INTO lupon_cases (
          id,
          resident_id,
          case_number,
          case_title,
          case_type,
          status,
          priority,
          confidential_summary,
          opened_at,
          resolved_at,
          assigned_lupon_profile_id,
          created_by_profile_id
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
        RETURNING
          ${luponCaseReturnFields}`,
        [
          req.body.id ?? createId("LC"),
          residentId,
          req.body.caseNumber ?? createId("LPN"),
          caseTitle,
          caseType,
          status,
          priority,
          confidentialSummary,
          openedAt,
          req.body.resolvedAt ?? null,
          req.body.assignedLuponProfileId ?? req.user.profileId,
          req.user.profileId
        ]
      );

      const luponCase = result.rows[0];

      await writeAuditLog(pool, {
        actor: req.user,
        action: "lupon_case.created",
        targetType: "lupon_case",
        targetId: luponCase.id,
        metadata: {
          residentId: luponCase.resident_id,
          caseNumber: luponCase.case_number,
          caseTitle: luponCase.case_title,
          caseType: luponCase.case_type,
          status: luponCase.status,
          priority: luponCase.priority,
          assignedLuponProfileId: luponCase.assigned_lupon_profile_id
        }
      });

      return res.status(201).json({ luponCase: toLuponCaseResponse(luponCase) });
    } catch (error) {
      return next(error);
    }
  });

  router.patch("/cases/:id", requireRole("lupon"), async (req, res, next) => {
    const hasSummary = Object.prototype.hasOwnProperty.call(req.body ?? {}, "confidentialSummary");
    const hasTitle = Object.prototype.hasOwnProperty.call(req.body ?? {}, "caseTitle");

    if (!hasSummary && !hasTitle) {
      return res.status(400).json({
        error: "Case title or confidential summary is required."
      });
    }

    try {
      const result = await pool.query(
        `UPDATE lupon_cases
        SET case_title = COALESCE($1, case_title),
          confidential_summary = COALESCE($2, confidential_summary),
          updated_at = now()
        WHERE id = $3
        RETURNING
          ${luponCaseReturnFields}`,
        [
          hasTitle ? normalizeText(req.body.caseTitle) : null,
          hasSummary ? normalizeText(req.body.confidentialSummary) : null,
          req.params.id
        ]
      );

      if (result.rowCount === 0) {
        return res.status(404).json({ error: "Lupon case not found." });
      }

      await writeAuditLog(pool, {
        actor: req.user,
        action: "lupon_case.details_updated",
        targetType: "lupon_case",
        targetId: req.params.id,
        metadata: {
          changedFields: [
            ...(hasTitle ? ["caseTitle"] : []),
            ...(hasSummary ? ["confidentialSummary"] : [])
          ],
          ...(hasTitle ? { caseTitle: normalizeText(req.body.caseTitle) } : {})
        }
      });

      return res.json({ luponCase: toLuponCaseResponse(result.rows[0]) });
    } catch (error) {
      return next(error);
    }
  });

  router.post("/cases/:id/resolve", requireRole("lupon"), async (req, res, next) => {
    try {
      const resolvedAt = req.body?.resolvedAt || getTodayDate();
      const result = await pool.query(
        `UPDATE lupon_cases
        SET status = 'resolved',
          resolved_at = COALESCE(resolved_at, $1),
          resolved_by_profile_id = COALESCE(resolved_by_profile_id, $2),
          updated_at = now()
        WHERE id = $3
          AND status IN ('open', 'under_mediation')
        RETURNING
          ${luponCaseReturnFields}`,
        [resolvedAt, req.user.profileId, req.params.id]
      );

      if (result.rowCount === 0) {
        return res.status(404).json({ error: "Open Lupon case not found." });
      }

      const luponCase = result.rows[0];

      await writeAuditLog(pool, {
        actor: req.user,
        action: "lupon_case.resolved",
        targetType: "lupon_case",
        targetId: req.params.id,
        metadata: {
          residentId: luponCase.resident_id,
          caseNumber: luponCase.case_number,
          caseTitle: luponCase.case_title ?? luponCase.case_type,
          status: luponCase.status,
          resolvedAt: luponCase.resolved_at,
          resolvedByProfileId: luponCase.resolved_by_profile_id
        }
      });

      return res.json({ luponCase: toLuponCaseResponse(luponCase) });
    } catch (error) {
      return next(error);
    }
  });

  router.post("/cases/:id/notes", requireRole("lupon"), async (req, res, next) => {
    try {
      const missingFields = requireFields(req.body, ["noteBody"]);

      if (missingFields.length > 0) {
        return res.status(400).json({ error: "Missing required fields.", fields: missingFields });
      }

      const noteType = req.body.noteType ?? "internal";

      if (!validateLuponNoteType(noteType)) {
        return res.status(400).json({ error: "Invalid Lupon note type." });
      }

      const result = await pool.query(
        `INSERT INTO lupon_case_notes (
          id,
          lupon_case_id,
          note_type,
          note_body,
          created_by_profile_id
        )
        VALUES ($1, $2, $3, $4, $5)
        RETURNING
          id,
          lupon_case_id,
          note_type,
          note_body,
          created_by_profile_id,
          created_at`,
        [
          req.body.id ?? createId("LCN"),
          req.params.id,
          noteType,
          req.body.noteBody,
          req.user.profileId
        ]
      );

      const luponCaseNote = result.rows[0];

      await writeAuditLog(pool, {
        actor: req.user,
        action: "lupon_case_note.created",
        targetType: "lupon_case_note",
        targetId: luponCaseNote.id,
        metadata: {
          luponCaseId: luponCaseNote.lupon_case_id,
          noteType: luponCaseNote.note_type
        }
      });

      return res.status(201).json({
        luponCaseNote: toLuponCaseNoteResponse(luponCaseNote)
      });
    } catch (error) {
      return next(error);
    }
  });

  return router;
}
