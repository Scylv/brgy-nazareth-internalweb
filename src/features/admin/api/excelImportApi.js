import { ApiError, apiFetch } from "../../../shared/api/client";

const XLSX_CONTENT_TYPE =
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

export async function previewExcelImport(file, options = "") {
  return previewExcelImportSheet(file, options);
}

function validateExcelWorkbookFile(file, action) {
  if (!file) {
    throw new ApiError(`Select an .xlsx workbook before ${action}.`, { status: 400 });
  }

  if (!String(file.name ?? "").toLowerCase().endsWith(".xlsx")) {
    throw new ApiError(`Only .xlsx workbook uploads are supported for this ${action}.`, {
      status: 415
    });
  }
}

function getWorkbookHeaders(
  file,
  {
    selectedSheetName = "",
    headerRowNumber,
    columnMapping,
    sheetDefaults,
    importMode
  } = {}
) {
  return {
    "Content-Type": file.type || XLSX_CONTENT_TYPE,
    "X-File-Name": encodeURIComponent(file.name),
    ...(selectedSheetName ? { "X-Sheet-Name": encodeURIComponent(selectedSheetName) } : {}),
    ...(headerRowNumber ? { "X-Header-Row": String(headerRowNumber) } : {}),
    ...(columnMapping
      ? { "X-Column-Mapping": encodeURIComponent(JSON.stringify(columnMapping)) }
      : {}),
    ...(sheetDefaults
      ? { "X-Sheet-Defaults": encodeURIComponent(JSON.stringify(sheetDefaults)) }
      : {}),
    ...(importMode ? { "X-Import-Mode": encodeURIComponent(importMode) } : {})
  };
}

export async function fetchExcelWorkbookSheets(file) {
  validateExcelWorkbookFile(file, "sheet selection");

  return apiFetch("/api/admin/excel-import/sheets", {
    method: "POST",
    headers: getWorkbookHeaders(file),
    body: file
  });
}

export async function fetchExcelWorksheetHeaders(
  file,
  {
    selectedSheetName = "",
    headerRowNumber = 1
  } = {}
) {
  validateExcelWorkbookFile(file, "header selection");

  return apiFetch("/api/admin/excel-import/headers", {
    method: "POST",
    headers: getWorkbookHeaders(file, { selectedSheetName, headerRowNumber }),
    body: file
  });
}

export async function previewExcelImportSheet(file, options = "") {
  validateExcelWorkbookFile(file, "preview");
  const requestOptions =
    typeof options === "string" ? { selectedSheetName: options } : options;

  return apiFetch("/api/admin/excel-import/preview", {
    method: "POST",
    headers: getWorkbookHeaders(file, requestOptions),
    body: file
  });
}

export async function commitExcelImport(
  file,
  options = {}
) {
  return commitExcelImportSheet(file, options);
}

export async function commitExcelImportSheet(
  file,
  {
    importConfirmed = false,
    backupConfirmed = false,
    selectedSheetName = "",
    headerRowNumber = 1,
    columnMapping,
    sheetDefaults,
    importMode
  } = {}
) {
  validateExcelWorkbookFile(file, "import");

  if (!importConfirmed) {
    throw new ApiError("Confirm the preview before importing.", { status: 400 });
  }

  if (!backupConfirmed) {
    throw new ApiError("Confirm that a backup was created before importing.", { status: 400 });
  }

  return apiFetch("/api/admin/excel-import/commit", {
    method: "POST",
    headers: {
      ...getWorkbookHeaders(file, {
        selectedSheetName,
        headerRowNumber,
        columnMapping,
        sheetDefaults,
        importMode
      }),
      "X-Import-Confirmed": "true",
      "X-Backup-Confirmed": "true"
    },
    body: file
  });
}

export async function undoExcelImportBatch(importBatchId) {
  const batchId = String(importBatchId ?? "").trim();

  if (!batchId) {
    throw new ApiError("Select an import batch before undoing.", { status: 400 });
  }

  return apiFetch(`/api/admin/excel-import/batches/${encodeURIComponent(batchId)}/undo`, {
    method: "POST"
  });
}
