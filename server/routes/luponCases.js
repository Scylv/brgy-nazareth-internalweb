import { Router } from "express";
import { createId } from "../lib/ids.js";
import { toLuponCase, toLuponCaseNote } from "../lib/rows.js";
import {
  requireFields,
  validateLuponCasePriority,
  validateLuponCaseStatus,
  validateLuponNoteType
} from "../lib/validation.js";
import { requireRole } from "../middleware/roles.js";

export function createLuponCasesRouter(pool) {
  const router = Router();

  router.get("/cases", requireRole("lupon"), async (_req, res, next) => {
    try {
      const result = await pool.query(
        `SELECT
          id,
          resident_id,
          case_number,
          case_type,
          status,
          priority,
          confidential_summary,
          opened_at,
          resolved_at,
          assigned_lupon_profile_id,
          created_by_profile_id,
          created_at,
          updated_at
        FROM lupon_cases
        ORDER BY opened_at DESC`
      );

      res.json({ luponCases: result.rows.map(toLuponCase) });
    } catch (error) {
      next(error);
    }
  });

  router.post("/cases", requireRole("lupon"), async (req, res, next) => {
    try {
      const missingFields = requireFields(req.body, [
        "residentId",
        "caseNumber",
        "caseType",
        "confidentialSummary",
        "openedAt"
      ]);

      if (missingFields.length > 0) {
        return res.status(400).json({ error: "Missing required fields.", fields: missingFields });
      }

      const status = req.body.status ?? "open";
      const priority = req.body.priority ?? "normal";

      if (!validateLuponCaseStatus(status)) {
        return res.status(400).json({ error: "Invalid Lupon case status." });
      }

      if (!validateLuponCasePriority(priority)) {
        return res.status(400).json({ error: "Invalid Lupon case priority." });
      }

      const result = await pool.query(
        `INSERT INTO lupon_cases (
          id,
          resident_id,
          case_number,
          case_type,
          status,
          priority,
          confidential_summary,
          opened_at,
          resolved_at,
          assigned_lupon_profile_id,
          created_by_profile_id
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        RETURNING
          id,
          resident_id,
          case_number,
          case_type,
          status,
          priority,
          confidential_summary,
          opened_at,
          resolved_at,
          assigned_lupon_profile_id,
          created_by_profile_id,
          created_at,
          updated_at`,
        [
          req.body.id ?? createId("LC"),
          req.body.residentId,
          req.body.caseNumber,
          req.body.caseType,
          status,
          priority,
          req.body.confidentialSummary,
          req.body.openedAt,
          req.body.resolvedAt ?? null,
          req.body.assignedLuponProfileId ?? req.user.profileId,
          req.user.profileId
        ]
      );

      return res.status(201).json({ luponCase: toLuponCase(result.rows[0]) });
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

      return res.status(201).json({ luponCaseNote: toLuponCaseNote(result.rows[0]) });
    } catch (error) {
      return next(error);
    }
  });

  return router;
}
