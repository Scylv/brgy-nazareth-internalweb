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
const ALLOWED_RESIDENT_STATUS_COLORS = new Set(["green", "yellow", "red"]);
const DEFAULT_PAGE_SIZE = 25;
const MAX_PAGE_SIZE = 100;
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
const adminResidentReturnFields = `id,
          household_id,
          full_name,
          birth_date,
          gender,
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
          updated_at`;

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

function normalizeDate(value) {
  const text = normalizeText(value);

  return text || null;
}

function normalizeSectorList(value) {
  if (!Array.isArray(value)) {
    return [];
  }

  return Array.from(
    new Set(value.map((sector) => normalizeRequiredText(sector)).filter(Boolean))
  );
}

function parsePositiveInt(value, fallback) {
  const parsed = Number.parseInt(String(value ?? ""), 10);

  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

function getPagination(query) {
  const page = parsePositiveInt(query?.page, 1);
  const requestedPageSize = parsePositiveInt(query?.pageSize, DEFAULT_PAGE_SIZE);
  const pageSize = Math.min(requestedPageSize, MAX_PAGE_SIZE);

  return {
    page,
    pageSize,
    offset: (page - 1) * pageSize
  };
}

function getPaginationResponse({ items, page, pageSize, total }) {
  const totalPages = total > 0 ? Math.ceil(total / pageSize) : 0;

  return {
    items,
    page,
    pageSize,
    total,
    totalPages,
    hasNext: page < totalPages,
    hasPrevious: page > 1 && totalPages > 0
  };
}

function getResidentStatusFilter(query) {
  const status = normalizeText(query?.status).toLowerCase();

  if (["active", "archived", "all"].includes(status)) {
    return status;
  }

  if (String(query?.archived ?? "").toLowerCase() === "true") {
    return "archived";
  }

  if (String(query?.includeArchived ?? "").toLowerCase() === "true") {
    return "all";
  }

  if (String(query?.showArchived ?? "").toLowerCase() === "true") {
    return "all";
  }

  return "active";
}

function getAuditDetails(row) {
  const action = String(row.action ?? "");
  const entityType = String(row.entity_type ?? "");
  const metadata = row.metadata && typeof row.metadata === "object" ? row.metadata : {};

  if (entityType.startsWith("lupon_case")) {
    if (action.includes("note")) {
      return "Lupon case note recorded";
    }

    if (action.includes("created")) {
      return "Lupon case created";
    }

    if (action.includes("resolved")) {
      return "Lupon case resolved";
    }

    return "Lupon case updated";
  }

  if (entityType === "resident_document" && metadata.visibilityScope === "lupon_confidential") {
    return action.includes("archived")
      ? "Confidential document archived"
      : "Confidential document uploaded";
  }

  if (action === "resident.admin_created") {
    return "Resident created";
  }

  if (action === "resident.admin_archived") {
    return "Resident archived";
  }

  if (action === "resident.admin_restored") {
    return "Resident restored";
  }

  return action.replace(/[._-]+/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function toAdminAuditLogResponse(row) {
  return {
    id: row.id,
    timestamp: row.created_at,
    actorProfileId: row.actor_profile_id,
    actorName: row.actor_name ?? "System",
    role: row.actor_role ?? row.metadata?.actorRole ?? "",
    action: row.action,
    entityType: row.entity_type,
    entityReference: row.entity_id ?? "",
    details: getAuditDetails(row)
  };
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
    const query = normalizeText(req.query?.search || req.query?.q);
    const status = getResidentStatusFilter(req.query);
    const { page, pageSize, offset } = getPagination(req.query);
    const searchTerm = `%${query.toLowerCase()}%`;

    try {
      const countResult = await pool.query(
        `SELECT COUNT(*) AS total
        FROM residents
        WHERE
          (
            $2 = 'all'
            OR ($2 = 'active' AND archived_at IS NULL)
            OR ($2 = 'archived' AND archived_at IS NOT NULL)
          )
          AND (
            $1 = '%%'
            OR lower(full_name) LIKE $1
            OR lower(id) LIKE $1
            OR lower(household_id) LIKE $1
            OR lower(address) LIKE $1
            OR lower(coalesce(exact_address, '')) LIKE $1
            OR lower(coalesce(sitio, '')) LIKE $1
            OR lower(coalesce(precinct_number, '')) LIKE $1
          )`,
        [searchTerm, status]
      );
      const result = await pool.query(
        `SELECT
          ${adminResidentReturnFields}
        FROM residents
        WHERE
          (
            $2 = 'all'
            OR ($2 = 'active' AND archived_at IS NULL)
            OR ($2 = 'archived' AND archived_at IS NOT NULL)
          )
          AND (
            $1 = '%%'
            OR lower(full_name) LIKE $1
            OR lower(id) LIKE $1
            OR lower(household_id) LIKE $1
            OR lower(address) LIKE $1
            OR lower(coalesce(exact_address, '')) LIKE $1
            OR lower(coalesce(sitio, '')) LIKE $1
            OR lower(coalesce(precinct_number, '')) LIKE $1
          )
        ORDER BY archived_at NULLS FIRST, full_name ASC
        LIMIT $3
        OFFSET $4`,
        [searchTerm, status, pageSize, offset]
      );
      const items = result.rows.map(toAdminResidentResponse);
      const total = Number(countResult.rows[0]?.total ?? 0);
      const pageResponse = getPaginationResponse({ items, page, pageSize, total });

      return res.json({
        ...pageResponse,
        residents: pageResponse.items
      });
    } catch (error) {
      return next(error);
    }
  });

  router.post("/residents", requireRole("admin"), async (req, res, next) => {
    const body = req.body ?? {};
    const residentId = normalizeRequiredText(body.id || body.residentId);
    const householdId = normalizeRequiredText(body.householdId);
    const fullName = normalizeRequiredText(body.fullName || body.name);
    const gender = normalizeRequiredText(body.gender);
    const address = normalizeRequiredText(body.address);
    const statusColor = normalizeText(body.statusColor || body.status || "green").toLowerCase();
    const precinctNumber = normalizeNullableText(body.precinctNumber);
    const sectors = normalizeSectorList(body.sectors);
    const registeredVoter =
      typeof body.registeredVoter === "boolean"
        ? body.registeredVoter
        : Boolean(precinctNumber || sectors.includes("Registered Voter"));

    if (!residentId || !householdId || !fullName || !gender || !address) {
      return res.status(400).json({
        error: "Resident ID, household ID, full name, gender, and address are required."
      });
    }

    if (!ALLOWED_RESIDENT_STATUS_COLORS.has(statusColor)) {
      return res.status(400).json({ error: "Status color must be green, yellow, or red." });
    }

    if (!registeredVoter && precinctNumber) {
      return res.status(400).json({
        error: "Registered voter must be true when a precinct number is provided."
      });
    }

    try {
      const duplicateIdResult = await pool.query(
        `SELECT id
        FROM residents
        WHERE lower(id) = lower($1)`,
        [residentId]
      );

      if (duplicateIdResult.rowCount > 0) {
        return res.status(409).json({ error: "A resident with this RBI ID already exists." });
      }

      const potentialDuplicateResult = await pool.query(
        `SELECT id
        FROM residents
        WHERE lower(full_name) = lower($1)
          AND lower(address) = lower($2)
        LIMIT 1`,
        [fullName, address]
      );

      const result = await pool.query(
        `INSERT INTO residents (
          id,
          household_id,
          full_name,
          birth_date,
          gender,
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
          status_color
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
        RETURNING
          ${adminResidentReturnFields}`,
        [
          residentId,
          householdId,
          fullName,
          normalizeDate(body.birthDate),
          gender,
          normalizeNullableText(body.civilStatus),
          normalizeNullableText(body.occupation),
          address,
          normalizeNullableText(body.exactAddress),
          normalizeNullableText(body.contactNumber),
          normalizeNullableText(body.additionalInformation),
          sectors,
          registeredVoter,
          precinctNumber,
          normalizeNullableText(body.sitio),
          statusColor
        ]
      );

      await writeAuditLog(pool, {
        actor: req.user,
        action: "resident.admin_created",
        targetType: "resident",
        targetId: residentId,
        metadata: {
          householdId,
          statusColor,
          sectorCount: sectors.length,
          potentialDuplicateNameAddress: potentialDuplicateResult.rowCount > 0
        }
      });

      return res.status(201).json({
        resident: toAdminResidentResponse(result.rows[0]),
        warnings:
          potentialDuplicateResult.rowCount > 0
            ? ["A resident with the same full name and address already exists."]
            : []
      });
    } catch (error) {
      if (isDuplicateUsernameError(error)) {
        return res.status(409).json({ error: "A resident with this RBI ID already exists." });
      }

      return next(error);
    }
  });

  router.get("/residents/:id", requireRole("admin"), async (req, res, next) => {
    try {
      const result = await pool.query(
        `SELECT
          ${adminResidentReturnFields}
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
          ${adminResidentReturnFields}
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
          ${adminResidentReturnFields}`,
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
          ${adminResidentReturnFields}`,
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
          ${adminResidentReturnFields}`,
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

  router.get("/audit-logs", requireRole("admin"), async (req, res, next) => {
    const { page, pageSize, offset } = getPagination(req.query);
    const conditions = [];
    const params = [];

    function addCondition(sql, value) {
      params.push(value);
      conditions.push(sql.replace("?", `$${params.length}`));
    }

    const actor = normalizeText(req.query?.actor || req.query?.profile);
    const role = normalizeText(req.query?.role);
    const action = normalizeText(req.query?.action);
    const entityType = normalizeText(req.query?.entityType).replace(/\s+/g, "_");
    const dateFrom = normalizeText(req.query?.dateFrom);
    const dateTo = normalizeText(req.query?.dateTo);

    if (actor) {
      addCondition("(lower(profiles.display_name) LIKE lower(?) OR lower(profiles.username) LIKE lower(?))", `%${actor}%`);
      params.push(`%${actor}%`);
      conditions[conditions.length - 1] = conditions[conditions.length - 1].replace("?", `$${params.length}`);
    }

    if (role) {
      addCondition("profiles.role = ?", role);
    }

    if (action) {
      addCondition("lower(audit_logs.action) LIKE lower(?)", `%${action}%`);
    }

    if (entityType) {
      addCondition("lower(audit_logs.entity_type) LIKE lower(?)", `%${entityType}%`);
    }

    if (dateFrom) {
      addCondition("audit_logs.created_at >= ?::timestamptz", dateFrom);
    }

    if (dateTo) {
      addCondition("audit_logs.created_at <= ?::timestamptz", dateTo);
    }

    const whereClause = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";

    try {
      const countResult = await pool.query(
        `SELECT COUNT(*) AS total
        FROM audit_logs
        LEFT JOIN profiles ON profiles.id = audit_logs.actor_profile_id
        ${whereClause}`,
        params
      );
      const result = await pool.query(
        `SELECT
          audit_logs.id,
          audit_logs.actor_profile_id,
          profiles.display_name AS actor_name,
          profiles.role AS actor_role,
          audit_logs.action,
          audit_logs.entity_type,
          audit_logs.entity_id,
          audit_logs.metadata,
          audit_logs.created_at
        FROM audit_logs
        LEFT JOIN profiles ON profiles.id = audit_logs.actor_profile_id
        ${whereClause}
        ORDER BY audit_logs.created_at DESC
        LIMIT $${params.length + 1}
        OFFSET $${params.length + 2}`,
        [...params, pageSize, offset]
      );
      const items = result.rows.map(toAdminAuditLogResponse);

      return res.json(getPaginationResponse({
        items,
        page,
        pageSize,
        total: Number(countResult.rows[0]?.total ?? 0)
      }));
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
