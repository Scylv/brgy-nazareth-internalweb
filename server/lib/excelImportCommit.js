import { writeAuditLog } from "./audit.js";
import { parseExcelImportPreview } from "./excelImportPreview.js";
import { createId } from "./ids.js";

const IMPORT_TYPE = "residents_phase1_excel";
const ALL_ROWS_PREVIEW_LIMIT = Number.MAX_SAFE_INTEGER;
const DEFAULT_STATUS_COLOR = "green";
const IMPORT_MODES = new Set(["createOnly", "skipDuplicates", "updateMatches"]);
const DEFAULT_IMPORT_MODE = "skipDuplicates";

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
      updated_at
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
  return {
    rowsToCreate: preview.previewRows.filter((row) => row.importStatus === "new"),
    rowsToUpdate: preview.previewRows.filter((row) => row.importStatus === "updateCandidate"),
    rowsToSkip: preview.previewRows.filter(
      (row) => row.importStatus === "exactDuplicate" || row.importStatus === "possibleDuplicate"
    ),
    invalidRows: preview.previewRows.filter((row) => row.importStatus === "invalid")
  };
}

function countDeferredDocumentHistory(rows) {
  return rows.reduce(
    (total, row) => total + (row.documentRequestHistoryPreview?.length ?? 0),
    0
  );
}

function normalizeImportMode(importMode) {
  return IMPORT_MODES.has(importMode) ? importMode : DEFAULT_IMPORT_MODE;
}

function isNonVoterStatus(voterStatus) {
  return /non[-\s]?voter/i.test(String(voterStatus ?? ""));
}

function isRegisteredVoterStatus(voterStatus) {
  return /^(registered\s+)?voter$/i.test(String(voterStatus ?? "").trim());
}

function toResidentInsert(row) {
  const precinctNumber = trimText(row.precinctNo);
  const voterStatus = trimText(row.voterStatus);
  const registeredVoter = isNonVoterStatus(voterStatus)
    ? false
    : Boolean(precinctNumber) || isRegisteredVoterStatus(voterStatus);

  return {
    id: createId("RBI"),
    householdId: createId("HH-IMPORT"),
    fullName: collapseText(row.fullName),
    birthDate: nullableDate(row.birthDate),
    gender: nullableText(row.sex) ?? "",
    civilStatus: nullableText(row.civilStatus),
    occupation: nullableText(row.employment),
    address: collapseText(row.exactAddress || row.address),
    exactAddress: nullableText(row.exactAddress),
    contactNumber: nullableText(row.contactNumber),
    email: null,
    additionalInformation: nullableText(row.remarks),
    sectors: registeredVoter ? ["Registered Voter"] : [],
    registeredVoter,
    precinctNumber: registeredVoter ? precinctNumber : "",
    sitio: nullableText(row.sitio),
    statusColor: DEFAULT_STATUS_COLOR
  };
}

function toImportResidentValues(row) {
  const resident = toResidentInsert(row);

  return {
    fullName: resident.fullName,
    address: resident.address,
    exactAddress: resident.exactAddress,
    precinctNumber: resident.precinctNumber,
    birthDate: resident.birthDate,
    civilStatus: resident.civilStatus,
    occupation: resident.occupation,
    contactNumber: resident.contactNumber,
    sitio: resident.sitio,
    additionalInformation: resident.additionalInformation,
    gender: resident.gender,
    sectors: resident.sectors,
    registeredVoter: resident.registeredVoter,
    statusColor: resident.statusColor
  };
}

function toResidentSnapshot(row) {
  return {
    fullName: row.full_name ?? row.fullName ?? "",
    address: row.address ?? "",
    exactAddress: row.exact_address ?? row.exactAddress ?? null,
    precinctNumber: row.precinct_number ?? row.precinctNumber ?? null,
    birthDate: row.birth_date ?? row.birthDate ?? null,
    civilStatus: row.civil_status ?? row.civilStatus ?? null,
    occupation: row.occupation ?? null,
    contactNumber: row.contact_number ?? row.contactNumber ?? null,
    sitio: row.sitio ?? null,
    additionalInformation: row.additional_information ?? row.additionalInformation ?? null,
    gender: row.gender ?? "",
    sectors: row.sectors ?? [],
    registeredVoter: row.registered_voter ?? row.registeredVoter ?? false,
    statusColor: row.status_color ?? row.statusColor ?? DEFAULT_STATUS_COLOR
  };
}

function mergeImportedResidentValues(currentResident, row) {
  const currentValues = toResidentSnapshot(currentResident);
  const importedValues = toImportResidentValues(row);

  return {
    ...currentValues,
    fullName: importedValues.fullName || currentValues.fullName,
    address: importedValues.address || currentValues.address,
    exactAddress: importedValues.exactAddress ?? currentValues.exactAddress,
    precinctNumber: importedValues.precinctNumber ?? currentValues.precinctNumber,
    birthDate: importedValues.birthDate ?? currentValues.birthDate,
    civilStatus: importedValues.civilStatus ?? currentValues.civilStatus,
    occupation: importedValues.occupation ?? currentValues.occupation,
    contactNumber: importedValues.contactNumber ?? currentValues.contactNumber,
    sitio: importedValues.sitio ?? currentValues.sitio,
    additionalInformation:
      importedValues.additionalInformation ?? currentValues.additionalInformation,
    gender: importedValues.gender || currentValues.gender,
    sectors: importedValues.sectors,
    registeredVoter: importedValues.registeredVoter,
    statusColor: currentValues.statusColor
  };
}

async function insertImportBatch(
  pool,
  {
    importBatchId,
    sourceFilename,
    sheetName,
    headerRowNumber,
    columnMapping,
    sheetDefaults,
    importMode,
    totalRows,
    actor
  }
) {
  await pool.query(
    `INSERT INTO import_batches (
      id,
      import_type,
      source_filename,
      filename,
      sheet_name,
      header_row,
      mapping,
      defaults,
      mode,
      status,
      total_rows,
      successful_rows,
      failed_rows,
      created_by_profile_id
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'processing', $10, 0, 0, $11)`,
    [
      importBatchId,
      IMPORT_TYPE,
      sourceFilename,
      sourceFilename,
      sheetName,
      headerRowNumber,
      columnMapping,
      sheetDefaults,
      importMode,
      totalRows,
      getActorProfileId(actor)
    ]
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

async function updateResidentFromImport(pool, residentId, values) {
  await pool.query(
    `UPDATE residents
    SET
      full_name = $1,
      address = $2,
      exact_address = $3,
      precinct_number = $4,
      birth_date = $5,
      civil_status = $6,
      occupation = $7,
      contact_number = $8,
      sitio = $9,
      additional_information = $10,
      updated_at = now()
    WHERE id = $11`,
    [
      values.fullName,
      values.address,
      values.exactAddress,
      values.precinctNumber,
      values.birthDate,
      values.civilStatus,
      values.occupation,
      values.contactNumber,
      values.sitio,
      values.additionalInformation,
      residentId
    ]
  );
}

async function insertImportBatchRow(
  pool,
  { importBatchId, rowNumber, residentId = null, action, previousValues = null, newValues = null }
) {
  const rowStatus = action === "invalid" ? "failed" : "imported";

  await pool.query(
    `INSERT INTO import_batch_rows (
      id,
      import_batch_id,
      batch_id,
      row_number,
      resident_id,
      action,
      previous_values,
      new_values,
      status,
      created_record_type,
      created_record_id
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
    [
      createId("IBR"),
      importBatchId,
      importBatchId,
      rowNumber,
      residentId,
      action,
      previousValues ?? {},
      newValues ?? {},
      rowStatus,
      residentId ? "residents" : null,
      residentId
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
  updated,
  skippedDuplicates,
  failedValidation,
  documentHistoryDeferred
}) {
  return {
    importBatchId,
    sourceFilename,
    sheetName: preview.sheetName,
    importMode: preview.importMode,
    rowsDetected: preview.totalRowsDetected,
    created,
    updated,
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
    updated: summary.updated,
    skippedDuplicates: summary.skippedDuplicates,
    failedValidation: summary.failedValidation,
    documentHistoryCreated: summary.documentHistoryCreated,
    documentHistoryDeferred: summary.documentHistoryDeferred,
    backupConfirmed: true,
    importMode: summary.importMode,
    ignoredColumns: preview.ignoredColumns.map((column) => column.column),
    documentRequestPairsDetected: preview.documentRequestPairsDetected.length
  };
}

export async function commitPhase1ExcelImport(
  pool,
  {
    actor,
    sourceFilename,
    workbookBuffer,
    selectedSheetName = "",
    headerRowNumber = 1,
    columnMapping,
    sheetDefaults = {},
    importMode = DEFAULT_IMPORT_MODE
  }
) {
  const existingResidents = await loadExistingResidentsForCommit(pool);
  const normalizedImportMode = normalizeImportMode(importMode);
  const preview = parseExcelImportPreview(workbookBuffer, {
    existingResidents,
    previewRowLimit: ALL_ROWS_PREVIEW_LIMIT,
    selectedSheetName,
    headerRowNumber,
    columnMapping,
    sheetDefaults,
    importMode: normalizedImportMode
  });
  const { rowsToCreate, rowsToUpdate, rowsToSkip, invalidRows } = getCommitRows(preview);
  const failedValidation = invalidRows.length;
  const documentHistoryDeferred = countDeferredDocumentHistory(rowsToCreate);
  const importBatchId = createId("IMP");
  const summary = buildSummary({
    importBatchId,
    preview,
    sourceFilename,
    created: rowsToCreate.length,
    updated: rowsToUpdate.length,
    skippedDuplicates: rowsToSkip.length,
    failedValidation,
    documentHistoryDeferred
  });
  const existingById = new Map(existingResidents.map((resident) => [resident.id, resident]));

  await runInTransaction(pool, async (transaction) => {
    await insertImportBatch(transaction, {
      importBatchId,
      sourceFilename,
      sheetName: preview.sheetName,
      headerRowNumber: preview.headerRowNumber,
      columnMapping: preview.columnMapping,
      sheetDefaults: preview.sheetDefaults,
      importMode: preview.importMode,
      totalRows: summary.rowsDetected,
      actor
    });

    for (const row of rowsToCreate) {
      const resident = toResidentInsert(row);

      await insertResident(transaction, resident);
      await insertResidentStatusHistory(transaction, { resident, actor });
      await insertImportBatchRow(transaction, {
        importBatchId,
        rowNumber: row.rowNumber,
        residentId: resident.id,
        action: "created",
        newValues: toImportResidentValues(row)
      });
    }

    for (const row of rowsToUpdate) {
      const currentResident = existingById.get(row.matchedResidentId);

      if (!currentResident) {
        await insertImportBatchRow(transaction, {
          importBatchId,
          rowNumber: row.rowNumber,
          residentId: row.matchedResidentId,
          action: "skipped_duplicate"
        });
        continue;
      }

      const previousValues = toResidentSnapshot(currentResident);
      const newValues = mergeImportedResidentValues(currentResident, row);

      await updateResidentFromImport(transaction, row.matchedResidentId, newValues);
      await insertImportBatchRow(transaction, {
        importBatchId,
        rowNumber: row.rowNumber,
        residentId: row.matchedResidentId,
        action: "updated",
        previousValues,
        newValues
      });
    }

    for (const row of rowsToSkip) {
      await insertImportBatchRow(transaction, {
        importBatchId,
        rowNumber: row.rowNumber,
        residentId: row.matchedResidentId,
        action: "skipped_duplicate"
      });
    }

    for (const row of invalidRows) {
      await insertImportBatchRow(transaction, {
        importBatchId,
        rowNumber: row.rowNumber,
        action: "invalid"
      });
    }

    await completeImportBatch(transaction, {
      importBatchId,
      successfulRows: summary.created + summary.updated,
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

function makeHttpError(message, status) {
  const error = new Error(message);

  error.status = status;
  return error;
}

function safeJsonObject(value) {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value;
  }

  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);

      return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
    } catch (_error) {
      return {};
    }
  }

  return {};
}

async function loadImportBatchForUndo(pool, batchId) {
  const result = await pool.query(
    `SELECT id, rolled_back_at
    FROM import_batches
    WHERE id = $1`,
    [batchId]
  );

  return result.rows[0] ?? null;
}

async function loadImportBatchRowsForUndo(pool, batchId) {
  const result = await pool.query(
    `SELECT
      resident_id,
      action,
      previous_values,
      new_values,
      row_number
    FROM import_batch_rows
    WHERE batch_id = $1
    ORDER BY row_number DESC`,
    [batchId]
  );

  return result.rows;
}

async function archiveImportedResident(pool, { residentId, actor }) {
  await pool.query(
    `UPDATE residents
    SET
      archived_at = now(),
      archived_by_profile_id = $2,
      updated_at = now()
    WHERE id = $1`,
    [residentId, getActorProfileId(actor)]
  );
}

async function markImportBatchRolledBack(pool, batchId) {
  await pool.query(
    `UPDATE import_batches
    SET rolled_back_at = now()
    WHERE id = $1
    RETURNING id`,
    [batchId]
  );
}

export async function undoResidentImportBatch(pool, { actor, importBatchId }) {
  const batch = await loadImportBatchForUndo(pool, importBatchId);

  if (!batch) {
    throw makeHttpError("Import batch not found.", 404);
  }

  if (batch.rolled_back_at) {
    throw makeHttpError("This import batch has already been undone.", 409);
  }

  const rows = await loadImportBatchRowsForUndo(pool, importBatchId);
  let archivedCreated = 0;
  let restoredUpdated = 0;

  await runInTransaction(pool, async (transaction) => {
    for (const row of rows) {
      if (row.action === "created" && row.resident_id) {
        await archiveImportedResident(transaction, {
          residentId: row.resident_id,
          actor
        });
        archivedCreated += 1;
      }

      if (row.action === "updated" && row.resident_id) {
        const previousValues = safeJsonObject(row.previous_values);

        await updateResidentFromImport(transaction, row.resident_id, previousValues);
        restoredUpdated += 1;
      }
    }

    await markImportBatchRolledBack(transaction, importBatchId);
    await writeAuditLog(transaction, {
      actor,
      action: "excel_import.undone",
      targetType: "import_batch",
      targetId: importBatchId,
      metadata: {
        archivedCreated,
        restoredUpdated
      }
    });
  });

  return {
    summary: {
      importBatchId,
      archivedCreated,
      restoredUpdated
    }
  };
}
