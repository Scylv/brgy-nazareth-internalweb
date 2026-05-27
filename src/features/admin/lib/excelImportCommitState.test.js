import { describe, expect, it, vi } from "vitest";
import { commitExcelImportAndRefreshResidents } from "./excelImportCommitState";

describe("excelImportCommitState", () => {
  it("updates the import summary and reloads database residents after a successful commit", async () => {
    const summary = { rowsDetected: 2, created: 2 };
    const residents = [{ id: "resident-1" }, { id: "resident-2" }, { id: "resident-3" }];
    const commitExcelImportRequest = vi.fn(async () => ({ summary }));
    const fetchResidentList = vi.fn(async () => residents);
    const setExcelImportCommitSummary = vi.fn();
    const setDatabaseResidentList = vi.fn();

    const result = await commitExcelImportAndRefreshResidents({
      confirmations: { importConfirmed: true, backupConfirmed: true },
      commitExcelImportRequest,
      fetchResidentList,
      file: { name: "phase1.xlsx" },
      setDatabaseResidentList,
      setExcelImportCommitSummary
    });

    expect(result).toEqual({ summary, residentRefreshError: null });
    expect(commitExcelImportRequest).toHaveBeenCalledWith(
      { name: "phase1.xlsx" },
      { importConfirmed: true, backupConfirmed: true }
    );
    expect(fetchResidentList).toHaveBeenCalledOnce();
    expect(setExcelImportCommitSummary).toHaveBeenCalledWith(summary);
    expect(setDatabaseResidentList).toHaveBeenCalledWith(residents);
  });

  it("keeps the commit summary when the resident metric refresh fails", async () => {
    const summary = { rowsDetected: 1, created: 1 };
    const refreshError = new Error("residents unavailable");
    const setExcelImportCommitSummary = vi.fn();
    const setDatabaseResidentList = vi.fn();

    const result = await commitExcelImportAndRefreshResidents({
      confirmations: {},
      commitExcelImportRequest: vi.fn(async () => ({ summary })),
      fetchResidentList: vi.fn(async () => {
        throw refreshError;
      }),
      file: { name: "phase1.xlsx" },
      setDatabaseResidentList,
      setExcelImportCommitSummary
    });

    expect(result).toEqual({ summary, residentRefreshError: refreshError });
    expect(setExcelImportCommitSummary).toHaveBeenCalledWith(summary);
    expect(setDatabaseResidentList).not.toHaveBeenCalled();
  });
});
