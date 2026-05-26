import { writeAuditLog } from "./audit.js";
import { parseExcelImportPreview } from "./excelImportPreview.js";
import { createId } from "./ids.js";

const IMPORT_TYPE = "residents_phase1_excel";
const ALL_ROWS_PREVIEW_LIMIT = Number.MAX_SAFE_INTEGER;
const DEFAULT_STATUS_COLOR = "green";

function trimText(value) {
  return String(value ?? "").trim();
}

function collapseText(value) {
  return trimText(value).replace(/\s+/g, " ");
}

function normalizeTextForMatch(value) {
  return trimText(value)
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function nullableText(value) {
  const text = trimText(value);

  return text || null;
}

function nullableDate(value) {
  const text = trimText(value);

  return text || null;
}

function getActorProfileId(actor) {
  return actor?.profileId ?? actor?.id ?? null;
}

async function runInTransaction(pool, callback) {
  if (typeof pool.connect === "function") {
    const client = await pool.connect();

    try {
      await client.query("BEGIN");
      const result = await callback(client);
      await client.query("COMMIT");
      return result;
    } catch (error) {
      await client.query("ROLLBACK").catch(() => {});
      throw error;
    } finally {
      client.release();
    }
  }

  await pool.query("BEGIN");

  try {
    const result = await callback(pool);
    await pool.query("COMMIT");
    return result;
  } catch (error) {
    await pool.query("ROLLBACK").catch(() => {});
    throw error;
  }
}

async function loadExistingResidentsForCommit(pool) {
  const result = await pool.query(
    `SELECT
      id,
      full_name,
      birth_date,
      address,
      contact_number
    FROM residents
    ORDER BY full_name ASC`
  );

  return result.rows;
}

function getRowsByNumber(items) {
  return new Set(items.map((item) => item.rowNumber));
}

function getExistingDuplicateRows(preview, failedRows) {
  return new Set(
    preview.warnings
      .filter(
        (warning) =>
          warning.matchSource === "existingResident" &&
          warning.code === "possibleDuplicateNameBirthDate"
      )
      .map((warning) => warning.rowNumber)
      .filter((rowNumber) => !failedRows.has(rowNumber))
  );
}

function getResidentMatchKeys(row) {
  const normalizedName = normalizeTextForMatch(row.fullName);
  const normalizedBirthDate = trimText(row.birthDate);

  return {
    nameBirthDate:
      normalizedName && normalizedBirthDate ? `${normalizedName}|${normalizedBirthDate}` : ""
  };
}

function getCommitRows(preview) {
  const failedRows = getRowsByNumber(preview.errors);
  const duplicateRows = getExistingDuplicateRows(preview, failedRows);
  const seenNameBirthDates = new Set();
  const rowsToCreate = [];

  for (const row of preview.previewRows) {
    if (failedRows.has(row.rowNumber) || duplicateRows.has(row.rowNumber)) {
      continue;
    }

    const keys = getResidentMatchKeys(row);

    if (keys.nameBirthDate && seenNameBirthDates.has(keys.nameBirthDate)) {
      duplicateRows.add(row.rowNumber);
      continue;
    }

    rowsToCreate.push(row);

    if (keys.nameBirthDate) {
      seenNameBirthDates.add(keys.nameBirthDate);
    }
  }

  return {
    rowsToCreate,
    skippedDuplicates: duplicateRows.size
  };
}

function countDeferredDocumentHistory(rows) {
  return rows.reduce(
    (total, row) => total + (row.documentRequestHistoryPreview?.length ?? 0),
    0
  );
}

function toResidentInsert(row) {
  const precinctNumber = trimText(row.precinctNo);

  return {
    id: createId("RBI"),
    householdId: createId("HH-IMPORT"),
    fullName: collapseText(row.fullName),
    birthDate: nullableDate(row.birthDate),
    gender: "",
    civilStatus: nullableText(row.civilStatus),
    occupation: nullableText(row.employment),
    address: collapseText(row.exactAddress || row.address),
    exactAddress: nullableText(row.exactAddress),
    contactNumber: nullableText(row.contactNumber),
    email: null,
    additionalInformation: null,
    sectors: precinctNumber ? ["Registered Voter"] : [],
    registeredVoter: Boolean(precinctNumber),
    precinctNumber,
    sitio: nullableText(row.sitio),
    statusColor: DEFAULT_STATUS_COLOR
  };
}

async function insertImportBatch(pool, { importBatchId, sourceFilename, totalRows, actor }) {
  await pool.query(
    `INSERT INTO import_batches (
      id,
      import_type,
      source_filename,
      status,
      total_rows,
      successful_rows,
      failed_rows,
      created_by_profile_id
    )
    VALUES ($1, $2, $3, 'processing', $4, 0, 0, $5)`,
    [importBatchId, IMPORT_TYPE, sourceFilename, totalRows, getActorProfileId(actor)]
  );
}

async function completeImportBatch(pool, { importBatchId, successfulRows, failedRows }) {
  await pool.query(
    `UPDATE import_batches
    SET
      status = 'completed',
      successful_rows = $1,
      failed_rows = $2,
      completed_at = now()
    WHERE id = $3`,
    [successfulRows, failedRows, importBatchId]
  );
}

async function insertResident(pool, resident) {
  await pool.query(
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
      email,
      additional_information,
      sectors,
      registered_voter,
      precinct_number,
      sitio,
      status_color
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)`,
    [
      resident.id,
      resident.householdId,
      resident.fullName,
      resident.birthDate,
      resident.gender,
      resident.civilStatus,
      resident.occupation,
      resident.address,
      resident.exactAddress,
      resident.contactNumber,
      resident.email,
      resident.additionalInformation,
      resident.sectors,
      resident.registeredVoter,
      resident.precinctNumber,
      resident.sitio,
      resident.statusColor
    ]
  );
}

async function insertResidentStatusHistory(pool, { resident, actor }) {
  await pool.query(
    `INSERT INTO resident_status_history (
      id,
      resident_id,
      previous_status_color,
      new_status_color,
      reason,
      changed_by_profile_id
    )
    VALUES ($1, $2, NULL, $3, $4, $5)`,
    [
      createId("RSH"),
      resident.id,
      resident.statusColor,
      "Initial status from Phase 1 Excel import.",
      getActorProfileId(actor)
    ]
  );
}

function buildSummary({
  importBatchId,
  preview,
  sourceFilename,
  created,
  skippedDuplicates,
  failedValidation,
  documentHistoryDeferred
}) {
  return {
    importBatchId,
    sourceFilename,
    sheetName: preview.sheetName,
    rowsDetected: preview.totalRowsDetected,
    created,
    skippedDuplicates,
    failedValidation,
    documentHistoryCreated: 0,
    documentHistoryDeferred
  };
}

function buildAuditMetadata({ summary, preview }) {
  return {
    sourceFilename: summary.sourceFilename,
    sheetName: summary.sheetName,
    importBatchId: summary.importBatchId,
    rowsDetected: summary.rowsDetected,
    created: summary.created,
    skippedDuplicates: summary.skippedDuplicates,
    failedValidation: summary.failedValidation,
    documentHistoryCreated: summary.documentHistoryCreated,
    documentHistoryDeferred: summary.documentHistoryDeferred,
    backupConfirmed: true,
    ignoredColumns: preview.ignoredColumns.map((column) => column.column),
    documentRequestPairsDetected: preview.documentRequestPairsDetected.length
  };
}

export async function commitPhase1ExcelImport(
  pool,
  {
    actor,
    sourceFilename,
    workbookBuffer
  }
) {
  const existingResidents = await loadExistingResidentsForCommit(pool);
  const preview = parseExcelImportPreview(workbookBuffer, {
    existingResidents,
    previewRowLimit: ALL_ROWS_PREVIEW_LIMIT
  });
  const { rowsToCreate, skippedDuplicates } = getCommitRows(preview);
  const failedValidation = getRowsByNumber(preview.errors).size;
  const documentHistoryDeferred = countDeferredDocumentHistory(rowsToCreate);
  const importBatchId = createId("IMP");
  const summary = buildSummary({
    importBatchId,
    preview,
    sourceFilename,
    created: rowsToCreate.length,
    skippedDuplicates,
    failedValidation,
    documentHistoryDeferred
  });

  await runInTransaction(pool, async (transaction) => {
    await insertImportBatch(transaction, {
      importBatchId,
      sourceFilename,
      totalRows: summary.rowsDetected,
      actor
    });

    for (const row of rowsToCreate) {
      const resident = toResidentInsert(row);

      await insertResident(transaction, resident);
      await insertResidentStatusHistory(transaction, { resident, actor });
    }

    await completeImportBatch(transaction, {
      importBatchId,
      successfulRows: summary.created,
      failedRows: summary.failedValidation + summary.skippedDuplicates
    });

    await writeAuditLog(transaction, {
      actor,
      action: "excel_import.committed",
      targetType: "import_batch",
      targetId: importBatchId,
      metadata: buildAuditMetadata({ summary, preview })
    });
  });

  return {
    summary
  };
}
