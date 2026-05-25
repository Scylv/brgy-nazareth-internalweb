import { ApiError, apiFetch } from "../../../shared/api/client";

const XLSX_CONTENT_TYPE =
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

export async function previewExcelImport(file) {
  if (!file) {
    throw new ApiError("Select an .xlsx workbook before previewing.", { status: 400 });
  }

  if (!String(file.name ?? "").toLowerCase().endsWith(".xlsx")) {
    throw new ApiError("Only .xlsx workbook uploads are supported for this preview.", {
      status: 415
    });
  }

  return apiFetch("/api/admin/excel-import/preview", {
    method: "POST",
    headers: {
      "Content-Type": file.type || XLSX_CONTENT_TYPE,
      "X-File-Name": encodeURIComponent(file.name)
    },
    body: file
  });
}

export async function commitExcelImport(
  file,
  {
    importConfirmed = false,
    backupConfirmed = false
  } = {}
) {
  if (!file) {
    throw new ApiError("Select an .xlsx workbook before importing.", { status: 400 });
  }

  if (!String(file.name ?? "").toLowerCase().endsWith(".xlsx")) {
    throw new ApiError("Only .xlsx workbook uploads are supported for this import.", {
      status: 415
    });
  }

  if (!importConfirmed) {
    throw new ApiError("Confirm the preview before importing.", { status: 400 });
  }

  if (!backupConfirmed) {
    throw new ApiError("Confirm that a backup was created before importing.", { status: 400 });
  }

  return apiFetch("/api/admin/excel-import/commit", {
    method: "POST",
    headers: {
      "Content-Type": file.type || XLSX_CONTENT_TYPE,
      "X-File-Name": encodeURIComponent(file.name),
      "X-Import-Confirmed": "true",
      "X-Backup-Confirmed": "true"
    },
    body: file
  });
}
