import { Router } from "express";
import { requireRole } from "../middleware/roles.js";
import { toLuponCase, toLuponCaseNote, toResident } from "../lib/rows.js";

export function createResidentsRouter(pool) {
  const router = Router();

  router.get("/", requireRole("admin", "department", "lupon"), async (_req, res, next) => {
    try {
      const result = await pool.query(
        `SELECT
          id,
          household_id,
          full_name,
          birth_date,
          gender,
          civil_status,
          occupation,
          address,
          contact_number,
          email,
          additional_information,
          sectors,
          registered_voter,
          precinct_number,
          status_color,
          created_at,
          updated_at
        FROM residents
        ORDER BY full_name ASC`
      );

      res.json({ residents: result.rows.map(toResident) });
    } catch (error) {
      next(error);
    }
  });

  router.get("/:id", requireRole("admin", "department", "lupon"), async (req, res, next) => {
    try {
      const residentResult = await pool.query(
        `SELECT
          id,
          household_id,
          full_name,
          birth_date,
          gender,
          civil_status,
          occupation,
          address,
          contact_number,
          email,
          additional_information,
          sectors,
          registered_voter,
          precinct_number,
          status_color,
          created_at,
          updated_at
        FROM residents
        WHERE id = $1`,
        [req.params.id]
      );

      if (residentResult.rowCount === 0) {
        return res.status(404).json({ error: "Resident not found." });
      }

      const resident = toResident(residentResult.rows[0]);

      if (req.user.role !== "lupon") {
        return res.json({ resident });
      }

      const casesResult = await pool.query(
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
        WHERE resident_id = $1
        ORDER BY opened_at DESC`,
        [req.params.id]
      );

      const notesResult = await pool.query(
        `SELECT
          notes.id,
          notes.lupon_case_id,
          notes.note_type,
          notes.note_body,
          notes.created_by_profile_id,
          notes.created_at
        FROM lupon_case_notes notes
        INNER JOIN lupon_cases cases ON cases.id = notes.lupon_case_id
        WHERE cases.resident_id = $1
        ORDER BY notes.created_at DESC`,
        [req.params.id]
      );

      return res.json({
        resident,
        luponCases: casesResult.rows.map(toLuponCase),
        luponCaseNotes: notesResult.rows.map(toLuponCaseNote)
      });
    } catch (error) {
      return next(error);
    }
  });

  return router;
}
