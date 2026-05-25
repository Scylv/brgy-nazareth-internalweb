import { afterEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "../../../shared/api/client";
import { commitExcelImport, previewExcelImport } from "./excelImportApi";

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
  it("previews .xlsx workbooks with the source filename header", async () => {
    vi.stubEnv("VITE_API_BASE_URL", "http://api.test");
    const workbook = createWorkbookFile();
    const fetchMock = vi.fn(async () =>
      new Response(JSON.stringify({ totalRowsDetected: 1 }), {
        headers: { "content-type": "application/json" }
      })
    );
    vi.stubGlobal("fetch", fetchMock);

    await expect(previewExcelImport(workbook)).resolves.toEqual({ totalRowsDetected: 1 });
    expect(fetchMock).toHaveBeenCalledWith("http://api.test/api/admin/excel-import/preview", {
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
        backupConfirmed: true
      })
    ).resolves.toEqual({ summary: { rowsDetected: 1, created: 1 } });
    expect(fetchMock).toHaveBeenCalledWith("http://api.test/api/admin/excel-import/commit", {
      credentials: "include",
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": XLSX_CONTENT_TYPE,
        "X-File-Name": "phase1-fake.xlsx",
        "X-Import-Confirmed": "true",
        "X-Backup-Confirmed": "true"
      },
      body: workbook
    });
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
