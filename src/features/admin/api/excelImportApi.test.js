import { afterEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "../../../shared/api/client";
import {
  commitExcelImport,
  fetchExcelWorksheetHeaders,
  fetchExcelWorkbookSheets,
  previewExcelImport,
  undoExcelImportBatch
} from "./excelImportApi";

const XLSX_CONTENT_TYPE =
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

function createWorkbookFile(name = "phase1-fake.xlsx") {
  const file = new Blob(["fake workbook"], {
    type: XLSX_CONTENT_TYPE
  });

  file.name = name;

  return file;
}

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("excelImportApi", () => {
  it("loads workbook sheet names with the source filename header", async () => {
    vi.stubEnv("VITE_API_BASE_URL", "http://api.test");
    const workbook = createWorkbookFile();
    const fetchMock = vi.fn(async () =>
      new Response(
        JSON.stringify({
          sheetNames: ["Imported Residents"],
          defaultSelectedSheet: "Imported Residents"
        }),
        {
          headers: { "content-type": "application/json" }
        }
      )
    );
    vi.stubGlobal("fetch", fetchMock);

    await expect(fetchExcelWorkbookSheets(workbook)).resolves.toEqual({
      sheetNames: ["Imported Residents"],
      defaultSelectedSheet: "Imported Residents"
    });
    expect(fetchMock).toHaveBeenCalledWith("http://api.test/api/admin/excel-import/sheets", {
      credentials: "include",
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": XLSX_CONTENT_TYPE,
        "X-File-Name": "phase1-fake.xlsx"
      },
      body: workbook
    });
  });

  it("loads worksheet headers for the selected sheet and header row", async () => {
    vi.stubEnv("VITE_API_BASE_URL", "http://api.test");
    const workbook = createWorkbookFile();
    const fetchMock = vi.fn(async () =>
      new Response(
        JSON.stringify({
          sheetName: "Non Voters",
          headerRowNumber: 3,
          headers: [{ column: "A", header: "Last Name", field: "" }]
        }),
        {
          headers: { "content-type": "application/json" }
        }
      )
    );
    vi.stubGlobal("fetch", fetchMock);

    await expect(
      fetchExcelWorksheetHeaders(workbook, {
        selectedSheetName: "Non Voters",
        headerRowNumber: 3
      })
    ).resolves.toEqual({
      sheetName: "Non Voters",
      headerRowNumber: 3,
      headers: [{ column: "A", header: "Last Name", field: "" }]
    });
    expect(fetchMock).toHaveBeenCalledWith("http://api.test/api/admin/excel-import/headers", {
      credentials: "include",
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": XLSX_CONTENT_TYPE,
        "X-File-Name": "phase1-fake.xlsx",
        "X-Sheet-Name": "Non%20Voters",
        "X-Header-Row": "3"
      },
      body: workbook
    });
  });

  it("previews .xlsx workbooks with the source filename header", async () => {
    vi.stubEnv("VITE_API_BASE_URL", "http://api.test");
    const workbook = createWorkbookFile();
    const fetchMock = vi.fn(async () =>
      new Response(JSON.stringify({ totalRowsDetected: 1 }), {
        headers: { "content-type": "application/json" }
      })
    );
    vi.stubGlobal("fetch", fetchMock);

    await expect(
      previewExcelImport(workbook, {
        selectedSheetName: "Alternate Import",
        headerRowNumber: 2,
        columnMapping: {
          firstName: "B",
          lastName: "A",
          exactAddress: "C"
        },
        sheetDefaults: {
          voterStatus: "Non-voter"
        },
        importMode: "updateMatches"
      })
    ).resolves.toEqual({ totalRowsDetected: 1 });
    expect(fetchMock).toHaveBeenCalledWith("http://api.test/api/admin/excel-import/preview", {
      credentials: "include",
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": XLSX_CONTENT_TYPE,
        "X-File-Name": "phase1-fake.xlsx",
        "X-Sheet-Name": "Alternate%20Import",
        "X-Header-Row": "2",
        "X-Column-Mapping": encodeURIComponent(
          JSON.stringify({
            firstName: "B",
            lastName: "A",
            exactAddress: "C"
          })
        ),
        "X-Sheet-Defaults": encodeURIComponent(
          JSON.stringify({
            voterStatus: "Non-voter"
          })
        ),
        "X-Import-Mode": "updateMatches"
      },
      body: workbook
    });
  });

  it("commits .xlsx workbooks only after import and backup confirmation", async () => {
    vi.stubEnv("VITE_API_BASE_URL", "http://api.test");
    const workbook = createWorkbookFile();
    const fetchMock = vi.fn(async () =>
      new Response(JSON.stringify({ summary: { rowsDetected: 1, created: 1 } }), {
        headers: { "content-type": "application/json" }
      })
    );
    vi.stubGlobal("fetch", fetchMock);

    await expect(
      commitExcelImport(workbook, {
        importConfirmed: true,
        backupConfirmed: true,
        selectedSheetName: "Alternate Import",
        headerRowNumber: 2,
        columnMapping: {
          firstName: "B",
          lastName: "A",
          exactAddress: "C"
        },
        sheetDefaults: {
          voterStatus: "Non-voter"
        },
        importMode: "updateMatches"
      })
    ).resolves.toEqual({ summary: { rowsDetected: 1, created: 1 } });
    expect(fetchMock).toHaveBeenCalledWith("http://api.test/api/admin/excel-import/commit", {
      credentials: "include",
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": XLSX_CONTENT_TYPE,
        "X-File-Name": "phase1-fake.xlsx",
        "X-Sheet-Name": "Alternate%20Import",
        "X-Header-Row": "2",
        "X-Column-Mapping": encodeURIComponent(
          JSON.stringify({
            firstName: "B",
            lastName: "A",
            exactAddress: "C"
          })
        ),
        "X-Sheet-Defaults": encodeURIComponent(
          JSON.stringify({
            voterStatus: "Non-voter"
          })
        ),
        "X-Import-Mode": "updateMatches",
        "X-Import-Confirmed": "true",
        "X-Backup-Confirmed": "true"
      },
      body: workbook
    });
  });

  it("undoes an import batch by id", async () => {
    vi.stubEnv("VITE_API_BASE_URL", "http://api.test");
    const fetchMock = vi.fn(async () =>
      new Response(JSON.stringify({ summary: { importBatchId: "IMP-123" } }), {
        headers: { "content-type": "application/json" }
      })
    );
    vi.stubGlobal("fetch", fetchMock);

    await expect(undoExcelImportBatch("IMP-123")).resolves.toEqual({
      summary: { importBatchId: "IMP-123" }
    });
    expect(fetchMock).toHaveBeenCalledWith(
      "http://api.test/api/admin/excel-import/batches/IMP-123/undo",
      {
        credentials: "include",
        method: "POST",
        headers: {
          Accept: "application/json"
        }
      }
    );
  });

  it("rejects commit before both acknowledgements are checked", async () => {
    const workbook = createWorkbookFile();

    await expect(
      commitExcelImport(workbook, {
        importConfirmed: false,
        backupConfirmed: true
      })
    ).rejects.toBeInstanceOf(ApiError);
    await expect(
      commitExcelImport(workbook, {
        importConfirmed: true,
        backupConfirmed: false
      })
    ).rejects.toMatchObject({
      status: 400
    });
  });
});
