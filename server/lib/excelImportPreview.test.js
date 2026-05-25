import { describe, expect, it } from "vitest";
import {
  MAIN_RESIDENT_SHEET_NAME,
  parseExcelImportPreview
} from "./excelImportPreview.js";
import { buildPhase1Rows, createXlsxWorkbook } from "../testUtils/xlsxWorkbook.js";

function createPhase1Workbook(dataRows, sheetName = MAIN_RESIDENT_SHEET_NAME) {
  return createXlsxWorkbook({
    sheets: [
      {
        name: sheetName,
        rows: buildPhase1Rows(dataRows)
      }
    ]
  });
}

describe("parseExcelImportPreview", () => {
  it("maps the Phase 1 resident columns and repeated assistance/date pairs", () => {
    const workbook = createPhase1Workbook([
      [
        "Test Resident Alpha",
        "Zone 1",
        "0012A",
        "unmapped d",
        "unmapped e",
        "unmapped f",
        "1990-01-05",
        "Single",
        "Teacher",
        "House 1, Zone 1",
        "09170000001",
        "alpha social",
        "Sitio One",
        "PWD",
        "Review note",
        "",
        "Barangay Clearance",
        "2026-01-10",
        "Medical Assistance",
        "2026-02-11"
      ]
    ]);

    const preview = parseExcelImportPreview(workbook);

    expect(preview.totalRowsDetected).toBe(1);
    expect(preview.errors).toEqual([]);
    expect(preview.previewRows).toEqual([
      expect.objectContaining({
        rowNumber: 2,
        fullName: "Test Resident Alpha",
        address: "Zone 1",
        precinctNo: "0012A",
        birthDate: "1990-01-05",
        civilStatus: "Single",
        employment: "Teacher",
        exactAddress: "House 1, Zone 1",
        contactNumber: "09170000001",
        facebookName: "alpha social",
        sitio: "Sitio One",
        tag: "PWD",
        remarks: "Review note",
        ignoredNeedsClarification: ["D", "E", "F"],
        documentRequestHistoryPreview: [
          {
            assistanceRequested: "Barangay Clearance",
            date: "2026-01-10",
            sourceColumns: { assistance: "Q", date: "R" }
          },
          {
            assistanceRequested: "Medical Assistance",
            date: "2026-02-11",
            sourceColumns: { assistance: "S", date: "T" }
          }
        ]
      })
    ]);
    expect(preview.detectedColumns).toEqual(
      expect.arrayContaining([
        { column: "A", header: "", field: "fullName" },
        { column: "B", header: "ADDRESS", field: "address" },
        { column: "O", header: "REMARKS", field: "remarks" }
      ])
    );
    expect(preview.ignoredColumns).toEqual(
      expect.arrayContaining([
        { column: "D", reason: "needsClarification" },
        { column: "E", reason: "needsClarification" },
        { column: "F", reason: "needsClarification" }
      ])
    );
    expect(preview.documentRequestPairsDetected).toEqual([
      {
        assistanceColumn: "Q",
        dateColumn: "R",
        assistanceHeader: "Assistance Requested",
        dateHeader: "Date"
      },
      {
        assistanceColumn: "S",
        dateColumn: "T",
        assistanceHeader: "Assistance Requested",
        dateHeader: "Date"
      }
    ]);
    expect(JSON.stringify(preview.previewRows)).not.toContain("unmapped d");
    expect(JSON.stringify(preview.previewRows)).not.toContain("unmapped e");
    expect(JSON.stringify(preview.previewRows)).not.toContain("unmapped f");
  });

  it("reports row validation errors without rejecting the entire workbook", () => {
    const workbook = createPhase1Workbook([
      ["", "Zone 1", "", "", "", "", "", "Single"],
      ["Test Resident Beta", "", "", "", "", "", "", "Single", "", ""],
      [
        "Test Resident Gamma",
        "Zone 3",
        "",
        "",
        "",
        "",
        "not-a-date",
        "Single"
      ]
    ]);

    const preview = parseExcelImportPreview(workbook);

    expect(preview.totalRowsDetected).toBe(3);
    expect(preview.previewRows).toHaveLength(3);
    expect(preview.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          rowNumber: 2,
          field: "fullName",
          code: "fullNameRequired"
        }),
        expect.objectContaining({
          rowNumber: 3,
          field: "address",
          code: "addressRequired"
        }),
        expect.objectContaining({
          rowNumber: 4,
          field: "birthDate",
          code: "invalidBirthDate"
        })
      ])
    );
  });

  it("warns for duplicates by normalized name plus birthday or address but not name alone", () => {
    const workbook = createPhase1Workbook([
      [
        "Test Resident Delta",
        "Zone 4",
        "",
        "",
        "",
        "",
        "1985-03-15",
        "Married",
        "",
        "House 4, Zone 4"
      ],
      [
        "test resident delta",
        "Zone 4",
        "",
        "",
        "",
        "",
        "1985-03-15",
        "M",
        "",
        "House 4, Zone 4"
      ],
      [
        "Test Resident Delta",
        "Different Zone",
        "",
        "",
        "",
        "",
        "",
        "Single",
        "",
        "Different House"
      ]
    ]);

    const preview = parseExcelImportPreview(workbook);

    expect(preview.warnings).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          rowNumber: 3,
          code: "possibleDuplicateNameBirthDate"
        }),
        expect.objectContaining({
          rowNumber: 3,
          code: "possibleDuplicateNameAddress"
        })
      ])
    );
    expect(preview.warnings).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          rowNumber: 4,
          code: "possibleDuplicateNameOnly"
        })
      ])
    );
  });

  it("compares preview rows to existing residents for duplicate warnings", () => {
    const workbook = createPhase1Workbook([
      [
        "Test Resident Echo",
        "Zone 5",
        "",
        "",
        "",
        "",
        "1970-12-24",
        "Widowed",
        "",
        "House 5, Zone 5"
      ]
    ]);

    const preview = parseExcelImportPreview(workbook, {
      existingResidents: [
        {
          id: "RBI-FAKE-0001",
          full_name: "test resident echo",
          birth_date: "1970-12-24",
          address: "House 5, Zone 5"
        }
      ]
    });

    expect(preview.warnings).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          rowNumber: 2,
          code: "possibleDuplicateNameBirthDate",
          matchSource: "existingResident"
        }),
        expect.objectContaining({
          rowNumber: 2,
          code: "possibleDuplicateNameAddress",
          matchSource: "existingResident"
        })
      ])
    );
    expect(JSON.stringify(preview.warnings)).not.toContain("Test Resident Echo");
  });

  it("rejects workbooks that do not contain the Phase 1 sheet", () => {
    const workbook = createPhase1Workbook([], "Non-Voters");

    expect(() => parseExcelImportPreview(workbook)).toThrow(
      'Sheet "Brgy Nazareth Inhabitatns" was not found.'
    );
  });

  it("rejects empty workbook input", () => {
    expect(() => parseExcelImportPreview(Buffer.alloc(0))).toThrow(
      "An .xlsx file buffer is required."
    );
  });
});
