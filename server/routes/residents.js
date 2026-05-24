import { Router } from "express";
import { requireRole } from "../middleware/roles.js";
import { toLuponCase, toLuponCaseNote, toResident } from "../lib/rows.js";
import { validateResidentStatus } from "../lib/validation.js";

const allowedResidentUpdateFields = [
  "householdId",
  "fullName",
  "name",
  "birthDate",
  "gender",
  "civilStatus",
  "occupation",
  "address",
  "contactNumber",
  "email",
  "additionalInformation",
  "sectors",
  "registeredVoter",
  "precinctNumber",
  "status",
  "statusColor"
];

function hasOwn(body, field) {
  return Object.prototype.hasOwnProperty.call(body, field);
}

function pickResidentValue(body, currentResident, bodyField, rowField) {
  return hasOwn(body, bodyField) ? body[bodyField] : currentResident[rowField];
}

function getRequestedStatus(body) {
  if (hasOwn(body, "status")) {
    return body.status;
  }

  if (hasOwn(body, "statusColor")) {
    return body.statusColor;
  }

  return undefined;
}

function hasAllowedResidentUpdate(body) {
  return allowedResidentUpdateFields.some((field) => hasOwn(body, field));
}

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

  router.patch("/:id", requireRole("lupon"), async (req, res, next) => {
    try {
      if (!hasAllowedResidentUpdate(req.body ?? {})) {
        return res.status(400).json({ error: "At least one allowed resident field is required." });
      }

      const requestedStatus = getRequestedStatus(req.body);

      if (requestedStatus !== undefined && !validateResidentStatus(requestedStatus)) {
        return res.status(400).json({ error: "Invalid resident status." });
      }

      const currentResult = await pool.query(
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

      if (currentResult.rowCount === 0) {
        return res.status(404).json({ error: "Resident not found." });
      }

      const currentResident = currentResult.rows[0];
      const fullName = hasOwn(req.body, "fullName")
        ? req.body.fullName
        : pickResidentValue(req.body, currentResident, "name", "full_name");
      const statusColor = requestedStatus ?? currentResident.status_color;

      const updateResult = await pool.query(
        `UPDATE residents
        SET
          household_id = $1,
          full_name = $2,
          birth_date = $3,
          gender = $4,
          civil_status = $5,
          occupation = $6,
          address = $7,
          contact_number = $8,
          email = $9,
          additional_information = $10,
          sectors = $11,
          registered_voter = $12,
          precinct_number = $13,
          status_color = $14,
          updated_at = now()
        WHERE id = $15
        RETURNING
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
          updated_at`,
        [
          pickResidentValue(req.body, currentResident, "householdId", "household_id"),
          fullName,
          pickResidentValue(req.body, currentResident, "birthDate", "birth_date"),
          pickResidentValue(req.body, currentResident, "gender", "gender"),
          pickResidentValue(req.body, currentResident, "civilStatus", "civil_status"),
          pickResidentValue(req.body, currentResident, "occupation", "occupation"),
          pickResidentValue(req.body, currentResident, "address", "address"),
          pickResidentValue(req.body, currentResident, "contactNumber", "contact_number"),
          pickResidentValue(req.body, currentResident, "email", "email"),
          pickResidentValue(
            req.body,
            currentResident,
            "additionalInformation",
            "additional_information"
          ),
          pickResidentValue(req.body, currentResident, "sectors", "sectors"),
          pickResidentValue(req.body, currentResident, "registeredVoter", "registered_voter"),
          pickResidentValue(req.body, currentResident, "precinctNumber", "precinct_number"),
          statusColor,
          req.params.id
        ]
      );

      return res.json({ resident: toResident(updateResult.rows[0]) });
    } catch (error) {
      return next(error);
    }
  });

  return router;
}
