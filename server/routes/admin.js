import { Router, raw } from "express";
import { writeAuditLog } from "../lib/audit.js";
import { commitPhase1ExcelImport, undoResidentImportBatch } from "../lib/excelImportCommit.js";
import {
  getExcelWorkbookSheetSelection,
  getExcelWorksheetHeaders,
  parseExcelImportPreview
} from "../lib/excelImportPreview.js";
import { createId } from "../lib/ids.js";
import { hashPassword } from "../lib/passwords.js";
import { toAdminProfileResponse, toAdminResidentResponse } from "../lib/responseMappers.js";
import { requireRole } from "../middleware/roles.js";

const ALLOWED_ACCOUNT_ROLES = new Set(["admin", "department", "lupon"]);
const ALLOWED_ACCOUNT_STATUSES = new Set(["active", "disabled"]);
const XLSX_CONTENT_TYPES = new Set([
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/octet-stream"
]);
const EXCEL_PREVIEW_UPLOAD_LIMIT = "15mb";
const ALLOWED_ADMIN_RESIDENT_UPDATE_FIELDS = [
  "fullName",
  "address",
  "exactAddress",
  "precinctNumber",
  "birthDate",
  "civilStatus",
  "occupation",
  "contactNumber",
  "sitio",
  "additionalInformation"
];

function normalizeUsername(username) {
  return typeof username === "string" ? username.trim().toLowerCase() : "";
}

function normalizeText(value) {
  return typeof value === "string" ? value.trim() : "";
}

function isValidTemporaryPassword(password) {
  return typeof password === "string" && password.length >= 8;
}

function isDuplicateUsernameError(error) {
  return error?.code === "23505";
}

function decodeHeaderValue(value) {
  const headerValue = String(value ?? "").trim();

  if (!headerValue) {
    return "";
  }

  try {
    return decodeURIComponent(headerValue);
  } catch (_error) {
    return headerValue;
  }
}

function getUploadFilename(req) {
  return decodeHeaderValue(req.get("x-file-name"));
}

function getSelectedSheetName(req) {
  return decodeHeaderValue(req.get("x-sheet-name"));
}

function getSelectedHeaderRowNumber(req) {
  const headerRowNumber = Number(decodeHeaderValue(req.get("x-header-row")));

  return Number.isInteger(headerRowNumber) && headerRowNumber > 0 ? headerRowNumber : 1;
}

function parseJsonHeader(req, headerName) {
  const value = decodeHeaderValue(req.get(headerName));

  if (!value) {
    return {};
  }

  try {
    const parsed = JSON.parse(value);

    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
  } catch (_error) {
    return {};
  }
}

function getColumnMapping(req) {
  return parseJsonHeader(req, "x-column-mapping");
}

function getSheetDefaults(req) {
  return parseJsonHeader(req, "x-sheet-defaults");
}

function getImportMode(req) {
  return decodeHeaderValue(req.get("x-import-mode"));
}

function getBaseContentType(req) {
  return String(req.get("content-type") ?? "")
    .split(";")[0]
    .trim()
    .toLowerCase();
}

function isSupportedXlsxUpload(req) {
  const filename = getUploadFilename(req).toLowerCase();
  const contentType = getBaseContentType(req);

  if (!filename.endsWith(".xlsx")) {
    return false;
  }

  return XLSX_CONTENT_TYPES.has(contentType);
}

function shouldIncludeExcelDateDebug() {
  return process.env.NODE_ENV !== "production" && process.env.EXCEL_IMPORT_DEBUG_DATES === "true";
}

function isHeaderConfirmation(value) {
  return String(value ?? "").trim().toLowerCase() === "true";
}

function hasOwn(body, field) {
  return Object.prototype.hasOwnProperty.call(body ?? {}, field);
}

function hasAdminResidentUpdate(body) {
  return ALLOWED_ADMIN_RESIDENT_UPDATE_FIELDS.some((field) => hasOwn(body, field));
}

function pickAdminResidentValue(body, currentResident, bodyField, rowField) {
  return hasOwn(body, bodyField) ? body[bodyField] : currentResident[rowField];
}

function normalizeNullableText(value) {
  if (value === null || value === undefined) {
    return null;
  }

  const text = String(value).trim();

  return text || null;
}

function normalizeRequiredText(value) {
  return String(value ?? "").trim().replace(/\s+/g, " ");
}

function getAdminResidentChangedFields(body) {
  return ALLOWED_ADMIN_RESIDENT_UPDATE_FIELDS.filter((field) => hasOwn(body, field));
}

async function loadExistingResidentsForImportPreview(pool) {
  const result = await pool.query(
    `SELECT
      id,
      full_name,
      birth_date,
      address,
      exact_address,
      contact_number,
      sitio
    FROM residents
    ORDER BY full_name ASC`
  );

  return result.rows;
}

export function createAdminRouter(pool) {
  const router = Router();

  router.get("/residents", requireRole("admin"), async (req, res, next) => {
    const query = normalizeText(req.query?.q);
    const includeArchived = String(req.query?.includeArchived ?? "").toLowerCase() === "true";
    const searchTerm = `%${query.toLowerCase()}%`;

    try {
      const result = await pool.query(
        `SELECT
          id,
          household_id,
          full_name,
          birth_date,
          civil_status,
          occupation,
          address,
          exact_address,
          contact_number,
          additional_information,
          sectors,
          registered_voter,
          precinct_number,
          sitio,
          status_color,
          archived_at,
          archived_by_profile_id,
          created_at,
          updated_at
        FROM residents
        WHERE
          ($2 = true OR archived_at IS NULL)
          AND (
            $1 = '%%'
            OR lower(full_name) LIKE $1
            OR lower(id) LIKE $1
            OR lower(address) LIKE $1
            OR lower(coalesce(exact_address, '')) LIKE $1
            OR lower(coalesce(sitio, '')) LIKE $1
            OR lower(coalesce(precinct_number, '')) LIKE $1
          )
        ORDER BY archived_at NULLS FIRST, full_name ASC
        LIMIT 100`,
        [searchTerm, includeArchived]
      );

      return res.json({ residents: result.rows.map(toAdminResidentResponse) });
    } catch (error) {
      return next(error);
    }
  });

  router.get("/residents/:id", requireRole("admin"), async (req, res, next) => {
    try {
      const result = await pool.query(
        `SELECT
          id,
          household_id,
          full_name,
          birth_date,
          civil_status,
          occupation,
          address,
          exact_address,
          contact_number,
          additional_information,
          sectors,
          registered_voter,
          precinct_number,
          sitio,
          status_color,
          archived_at,
          archived_by_profile_id,
          created_at,
          updated_at
        FROM residents
        WHERE id = $1`,
        [req.params.id]
      );

      if (result.rowCount === 0) {
        return res.status(404).json({ error: "Resident not found." });
      }

      return res.json({ resident: toAdminResidentResponse(result.rows[0]) });
    } catch (error) {
      return next(error);
    }
  });

  router.patch("/residents/:id", requireRole("admin"), async (req, res, next) => {
    const body = req.body ?? {};

    if (!hasAdminResidentUpdate(body)) {
      return res.status(400).json({ error: "At least one allowed resident field is required." });
    }

    try {
      const currentResult = await pool.query(
        `SELECT
          id,
          household_id,
          full_name,
          birth_date,
          civil_status,
          occupation,
          address,
          exact_address,
          contact_number,
          additional_information,
          sectors,
          registered_voter,
          precinct_number,
          sitio,
          status_color,
          archived_at,
          archived_by_profile_id,
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
      const fullName = normalizeRequiredText(
        pickAdminResidentValue(body, currentResident, "fullName", "full_name")
      );
      const address = normalizeRequiredText(
        pickAdminResidentValue(body, currentResident, "address", "address")
      );
      const precinctNumber = normalizeNullableText(
        pickAdminResidentValue(body, currentResident, "precinctNumber", "precinct_number")
      );

      if (!fullName || !address) {
        return res.status(400).json({ error: "Full name and address are required." });
      }

      const updateResult = await pool.query(
        `UPDATE residents
        SET
          full_name = $1,
          address = $2,
          exact_address = $3,
          precinct_number = $4,
          registered_voter = $4 IS NOT NULL AND $4 <> '',
          birth_date = $5,
          civil_status = $6,
          occupation = $7,
          contact_number = $8,
          sitio = $9,
          additional_information = $10,
          updated_at = now()
        WHERE id = $11
        RETURNING
          id,
          household_id,
          full_name,
          birth_date,
          civil_status,
          occupation,
          address,
          exact_address,
          contact_number,
          additional_information,
          sectors,
          registered_voter,
          precinct_number,
          sitio,
          status_color,
          archived_at,
          archived_by_profile_id,
          created_at,
          updated_at`,
        [
          fullName,
          address,
          normalizeNullableText(
            pickAdminResidentValue(body, currentResident, "exactAddress", "exact_address")
          ),
          precinctNumber,
          normalizeNullableText(pickAdminResidentValue(body, currentResident, "birthDate", "birth_date")),
          normalizeNullableText(
            pickAdminResidentValue(body, currentResident, "civilStatus", "civil_status")
          ),
          normalizeNullableText(
            pickAdminResidentValue(body, currentResident, "occupation", "occupation")
          ),
          normalizeNullableText(
            pickAdminResidentValue(body, currentResident, "contactNumber", "contact_number")
          ),
          normalizeNullableText(pickAdminResidentValue(body, currentResident, "sitio", "sitio")),
          normalizeNullableText(
            pickAdminResidentValue(
              body,
              currentResident,
              "additionalInformation",
              "additional_information"
            )
          ),
          req.params.id
        ]
      );

      await writeAuditLog(pool, {
        actor: req.user,
        action: "resident.admin_updated",
        targetType: "resident",
        targetId: req.params.id,
        metadata: {
          changedFields: getAdminResidentChangedFields(body)
        }
      });

      return res.json({ resident: toAdminResidentResponse(updateResult.rows[0]) });
    } catch (error) {
      return next(error);
    }
  });

  router.post("/residents/:id/archive", requireRole("admin"), async (req, res, next) => {
    try {
      const result = await pool.query(
        `UPDATE residents
        SET
          archived_at = now(),
          archived_by_profile_id = $2,
          updated_at = now()
        WHERE id = $1
        RETURNING
          id,
          household_id,
          full_name,
          birth_date,
          civil_status,
          occupation,
          address,
          exact_address,
          contact_number,
          additional_information,
          sectors,
          registered_voter,
          precinct_number,
          sitio,
          status_color,
          archived_at,
          archived_by_profile_id,
          created_at,
          updated_at`,
        [req.params.id, req.user.profileId]
      );

      if (result.rowCount === 0) {
        return res.status(404).json({ error: "Resident not found." });
      }

      await writeAuditLog(pool, {
        actor: req.user,
        action: "resident.admin_archived",
        targetType: "resident",
        targetId: req.params.id,
        metadata: {
          archived: true
        }
      });

      return res.json({ resident: toAdminResidentResponse(result.rows[0]) });
    } catch (error) {
      return next(error);
    }
  });

  router.post("/residents/:id/restore", requireRole("admin"), async (req, res, next) => {
    try {
      const result = await pool.query(
        `UPDATE residents
        SET
          archived_at = NULL,
          archived_by_profile_id = NULL,
          updated_at = now()
        WHERE id = $1
        RETURNING
          id,
          household_id,
          full_name,
          birth_date,
          civil_status,
          occupation,
          address,
          exact_address,
          contact_number,
          additional_information,
          sectors,
          registered_voter,
          precinct_number,
          sitio,
          status_color,
          archived_at,
          archived_by_profile_id,
          created_at,
          updated_at`,
        [req.params.id]
      );

      if (result.rowCount === 0) {
        return res.status(404).json({ error: "Resident not found." });
      }

      await writeAuditLog(pool, {
        actor: req.user,
        action: "resident.admin_restored",
        targetType: "resident",
        targetId: req.params.id,
        metadata: {
          archived: false
        }
      });

      return res.json({ resident: toAdminResidentResponse(result.rows[0]) });
    } catch (error) {
      return next(error);
    }
  });

  router.get("/profiles", requireRole("admin"), async (_req, res, next) => {
    try {
      const result = await pool.query(
        `SELECT
          id,
          username,
          display_name,
          role,
          status,
          created_at,
          updated_at
        FROM profiles
        ORDER BY created_at ASC, username ASC`
      );

      return res.json({ profiles: result.rows.map(toAdminProfileResponse) });
    } catch (error) {
      return next(error);
    }
  });

  router.post(
    "/excel-import/sheets",
    requireRole("admin"),
    raw({
      limit: EXCEL_PREVIEW_UPLOAD_LIMIT,
      type: "*/*"
    }),
    async (req, res, next) => {
      if (!isSupportedXlsxUpload(req)) {
        return res.status(415).json({
          error: "Only .xlsx workbook uploads are supported for sheet selection."
        });
      }

      if (!Buffer.isBuffer(req.body) || req.body.length === 0) {
        return res.status(400).json({ error: "An .xlsx workbook file is required." });
      }

      try {
        return res.json(getExcelWorkbookSheetSelection(req.body));
      } catch (error) {
        if (
          error instanceof Error &&
          (error.message.includes(".xlsx") ||
            error.message.includes("worksheet") ||
            error.message.includes("workbook"))
        ) {
          return res.status(400).json({ error: error.message });
        }

        return next(error);
      }
    }
  );

  router.post(
    "/excel-import/headers",
    requireRole("admin"),
    raw({
      limit: EXCEL_PREVIEW_UPLOAD_LIMIT,
      type: "*/*"
    }),
    async (req, res, next) => {
      if (!isSupportedXlsxUpload(req)) {
        return res.status(415).json({
          error: "Only .xlsx workbook uploads are supported for header selection."
        });
      }

      if (!Buffer.isBuffer(req.body) || req.body.length === 0) {
        return res.status(400).json({ error: "An .xlsx workbook file is required." });
      }

      try {
        return res.json(
          getExcelWorksheetHeaders(req.body, {
            selectedSheetName: getSelectedSheetName(req),
            headerRowNumber: getSelectedHeaderRowNumber(req)
          })
        );
      } catch (error) {
        if (
          error instanceof Error &&
          (error.message.includes(".xlsx") ||
            error.message.includes("Sheet") ||
            error.message.includes("worksheet") ||
            error.message.includes("workbook"))
        ) {
          return res.status(400).json({ error: error.message });
        }

        return next(error);
      }
    }
  );

  router.post(
    "/excel-import/preview",
    requireRole("admin"),
    raw({
      limit: EXCEL_PREVIEW_UPLOAD_LIMIT,
      type: "*/*"
    }),
    async (req, res, next) => {
      if (!isSupportedXlsxUpload(req)) {
        return res.status(415).json({
          error: "Only .xlsx workbook uploads are supported for this import preview."
        });
      }

      if (!Buffer.isBuffer(req.body) || req.body.length === 0) {
        return res.status(400).json({ error: "An .xlsx workbook file is required." });
      }

      try {
        const existingResidents = await loadExistingResidentsForImportPreview(pool);
        const preview = parseExcelImportPreview(req.body, {
          existingResidents,
          includeDateDebug: shouldIncludeExcelDateDebug(),
          selectedSheetName: getSelectedSheetName(req),
          headerRowNumber: getSelectedHeaderRowNumber(req),
          columnMapping: getColumnMapping(req),
          sheetDefaults: getSheetDefaults(req),
          importMode: getImportMode(req)
        });
        const sourceFilename = getUploadFilename(req);

        await writeAuditLog(pool, {
          actor: req.user,
          action: "excel_import.preview_created",
          targetType: "excel_import_preview",
          targetId: null,
          metadata: {
            sourceFilename,
            sheetName: preview.sheetName,
            totalRowsDetected: preview.totalRowsDetected,
            previewRowsReturned: preview.previewRows.length,
            warningCount: preview.warnings.length,
            errorCount: preview.errors.length,
            detectedColumnCount: preview.detectedColumns.length,
            ignoredColumns: preview.ignoredColumns.map((column) => column.column),
            documentRequestPairsDetected: preview.documentRequestPairsDetected.length
          }
        });

        return res.json(preview);
      } catch (error) {
        if (
          error instanceof Error &&
          (error.message.includes(".xlsx") ||
            error.message.includes("Sheet") ||
            error.message.includes("workbook"))
        ) {
          return res.status(400).json({ error: error.message });
        }

        return next(error);
      }
    }
  );

  router.post(
    "/excel-import/commit",
    requireRole("admin"),
    raw({
      limit: EXCEL_PREVIEW_UPLOAD_LIMIT,
      type: "*/*"
    }),
    async (req, res, next) => {
      if (!isHeaderConfirmation(req.get("x-import-confirmed"))) {
        return res.status(400).json({
          error: "Explicit Admin import confirmation is required before commit."
        });
      }

      if (!isHeaderConfirmation(req.get("x-backup-confirmed"))) {
        return res.status(400).json({
          error: "backup confirmation is required before import commit."
        });
      }

      if (!isSupportedXlsxUpload(req)) {
        return res.status(415).json({
          error: "Only .xlsx workbook uploads are supported for this import commit."
        });
      }

      if (!Buffer.isBuffer(req.body) || req.body.length === 0) {
        return res.status(400).json({ error: "An .xlsx workbook file is required." });
      }

      try {
        const result = await commitPhase1ExcelImport(pool, {
          actor: req.user,
          sourceFilename: getUploadFilename(req),
          workbookBuffer: req.body,
          selectedSheetName: getSelectedSheetName(req),
          headerRowNumber: getSelectedHeaderRowNumber(req),
          columnMapping: getColumnMapping(req),
          sheetDefaults: getSheetDefaults(req),
          importMode: getImportMode(req)
        });

        return res.json(result);
      } catch (error) {
        if (
          error instanceof Error &&
          (error.message.includes(".xlsx") ||
            error.message.includes("Sheet") ||
            error.message.includes("workbook"))
        ) {
          return res.status(400).json({ error: error.message });
        }

        return next(error);
      }
    }
  );

  router.post(
    "/excel-import/batches/:id/undo",
    requireRole("admin"),
    async (req, res, next) => {
      try {
        const result = await undoResidentImportBatch(pool, {
          actor: req.user,
          importBatchId: req.params.id
        });

        return res.json(result);
      } catch (error) {
        if (error?.status) {
          return res.status(error.status).json({ error: error.message });
        }

        return next(error);
      }
    }
  );

  router.post("/profiles", requireRole("admin"), async (req, res, next) => {
    const username = normalizeUsername(req.body?.username);
    const displayName = normalizeText(req.body?.displayName);
    const role = normalizeText(req.body?.role);
    const temporaryPassword = req.body?.temporaryPassword;

    if (!username || !displayName || !role || !isValidTemporaryPassword(temporaryPassword)) {
      return res.status(400).json({
        error: "Username, display name, role, and a temporary password of at least 8 characters are required."
      });
    }

    if (!ALLOWED_ACCOUNT_ROLES.has(role)) {
      return res.status(400).json({ error: "Invalid account role." });
    }

    try {
      const result = await pool.query(
        `INSERT INTO profiles (
          id,
          username,
          display_name,
          role,
          password_hash,
          status
        )
        VALUES ($1, $2, $3, $4, $5, 'active')
        RETURNING
          id,
          username,
          display_name,
          role,
          status,
          created_at,
          updated_at`,
        [
          createId("PROF"),
          username,
          displayName,
          role,
          hashPassword(temporaryPassword)
        ]
      );
      const profile = result.rows[0];

      await writeAuditLog(pool, {
        actor: req.user,
        action: "profile.created",
        targetType: "profile",
        targetId: profile.id,
        metadata: {
          targetUsername: profile.username,
          targetRole: profile.role,
          targetStatus: profile.status
        }
      });

      return res.status(201).json({ profile: toAdminProfileResponse(profile) });
    } catch (error) {
      if (isDuplicateUsernameError(error)) {
        return res.status(409).json({ error: "An account with this username already exists." });
      }

      return next(error);
    }
  });

  router.patch("/profiles/:id/status", requireRole("admin"), async (req, res, next) => {
    const status = normalizeText(req.body?.status);

    if (!ALLOWED_ACCOUNT_STATUSES.has(status)) {
      return res.status(400).json({ error: "Invalid account status." });
    }

    try {
      const result = await pool.query(
        `UPDATE profiles
        SET status = $1,
          updated_at = now()
        WHERE id = $2
        RETURNING
          id,
          username,
          display_name,
          role,
          status,
          created_at,
          updated_at`,
        [status, req.params.id]
      );

      if (result.rowCount === 0) {
        return res.status(404).json({ error: "Account was not found." });
      }

      const profile = result.rows[0];

      await writeAuditLog(pool, {
        actor: req.user,
        action: "profile.status_updated",
        targetType: "profile",
        targetId: profile.id,
        metadata: {
          targetUsername: profile.username,
          targetRole: profile.role,
          targetStatus: profile.status
        }
      });

      return res.json({ profile: toAdminProfileResponse(profile) });
    } catch (error) {
      return next(error);
    }
  });

  router.post("/profiles/:id/reset-password", requireRole("admin"), async (req, res, next) => {
    const temporaryPassword = req.body?.temporaryPassword;

    if (!isValidTemporaryPassword(temporaryPassword)) {
      return res.status(400).json({
        error: "A temporary password of at least 8 characters is required."
      });
    }

    try {
      const result = await pool.query(
        `UPDATE profiles
        SET password_hash = $1,
          updated_at = now()
        WHERE id = $2
        RETURNING
          id,
          username,
          display_name,
          role,
          status,
          created_at,
          updated_at`,
        [hashPassword(temporaryPassword), req.params.id]
      );

      if (result.rowCount === 0) {
        return res.status(404).json({ error: "Account was not found." });
      }

      const profile = result.rows[0];

      await writeAuditLog(pool, {
        actor: req.user,
        action: "profile.password_reset",
        targetType: "profile",
        targetId: profile.id,
        metadata: {
          targetUsername: profile.username,
          targetRole: profile.role,
          targetStatus: profile.status
        }
      });

      return res.json({ profile: toAdminProfileResponse(profile) });
    } catch (error) {
      return next(error);
    }
  });

  return router;
}
