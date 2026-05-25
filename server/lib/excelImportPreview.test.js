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

function excelDateSerial(year, month, day) {
  const excelEpoch = Date.UTC(1899, 11, 30);
  const date = Date.UTC(year, month - 1, day);

  return Math.floor((date - excelEpoch) / (24 * 60 * 60 * 1000));
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

  it("preserves Phase 1 fixed column values for numeric/text contact and birthday formats", () => {
    const workbook = createXlsxWorkbook({
      styles: [
        { numFmtCode: "00000000000" },
        { numFmtCode: "0000" }
      ],
      sheets: [
        {
          name: MAIN_RESIDENT_SHEET_NAME,
          rows: buildPhase1Rows([
            [
              "Test Resident Format One",
              "Zone 7",
              { type: "number", value: 12, styleId: 2 },
              null,
              null,
              null,
              "August 20, 2005",
              "Single",
              "Student",
              "House 7, Zone 7",
              { type: "number", value: "9.170000001E+9", styleId: 1 },
              "format one social",
              "Sitio Seven",
              "TAG-1",
              "Synthetic format note"
            ],
            [
              "Test Resident Format Two",
              "Zone 8",
              "0013B",
              null,
              null,
              null,
              { type: "number", value: excelDateSerial(2005, 8, 21) },
              "Married",
              "Vendor",
              "House 8, Zone 8",
              "09170000002",
              "format two social",
              "Sitio Eight",
              "TAG-2",
              "Synthetic format note two"
            ]
          ])
        }
      ]
    });

    const preview = parseExcelImportPreview(workbook);

    expect(preview.errors).toEqual([]);
    expect(preview.previewRows).toEqual([
      expect.objectContaining({
        rowNumber: 2,
        fullName: "Test Resident Format One",
        precinctNo: "0012",
        birthDate: "2005-08-20",
        birthDateDisplay: "August 20, 2005",
        civilStatus: "Single",
        employment: "Student",
        exactAddress: "House 7, Zone 7",
        contactNumber: "09170000001",
        ignoredNeedsClarification: ["D", "E", "F"]
      }),
      expect.objectContaining({
        rowNumber: 3,
        fullName: "Test Resident Format Two",
        precinctNo: "0013B",
        birthDate: "2005-08-21",
        birthDateDisplay: "2005-08-21",
        civilStatus: "Married",
        employment: "Vendor",
        exactAddress: "House 8, Zone 8",
        contactNumber: "09170000002",
        ignoredNeedsClarification: ["D", "E", "F"]
      })
    ]);
    expect(JSON.stringify(preview.previewRows)).not.toMatch(/\d+\.\d+E\+\d+/i);
  });

  it("does not return a blank birthday for an Excel date cell formatted as Month Day, Year", () => {
    const workbook = createXlsxWorkbook({
      styles: [{ numFmtCode: "mmmm d, yyyy" }],
      sheets: [
        {
          name: MAIN_RESIDENT_SHEET_NAME,
          rows: buildPhase1Rows([
            [
              "Test Resident Date Cell",
              "Zone 9",
              "0014C",
              null,
              null,
              null,
              { type: "date", value: "2005-08-20 00:00:00", styleId: 1 },
              "Single",
              "Student",
              "House 9, Zone 9",
              "09170000003"
            ],
            [
              "Test Resident Iso Date Cell",
              "Zone 10",
              "0015C",
              null,
              null,
              null,
              { type: "date", value: "2005-08-20T00:00:00.000Z", styleId: 1 },
              "Single",
              "Student",
              "House 10, Zone 10",
              "09170000004"
            ],
            [
              "Test Resident Js Date Text",
              "Zone 11",
              "0016C",
              null,
              null,
              null,
              {
                type: "date",
                value: "Sat Aug 20 2005 00:00:00 GMT+0800 (Philippine Standard Time)",
                styleId: 1
              },
              "Single",
              "Student",
              "House 11, Zone 11",
              "09170000005"
            ]
          ])
        }
      ]
    });

    const preview = parseExcelImportPreview(workbook);

    expect(preview.errors).toEqual([]);
    expect(preview.previewRows[0]).toEqual(
      expect.objectContaining({
        rowNumber: 2,
        birthDate: "2005-08-20",
        birthDateDisplay: "August 20, 2005",
        civilStatus: "Single",
        employment: "Student",
        contactNumber: "09170000003",
        ignoredNeedsClarification: ["D", "E", "F"]
      })
    );
    expect(preview.previewRows[0].birthDate).not.toBe("");
    expect(preview.previewRows[1].birthDate).toBe("2005-08-20");
    expect(preview.previewRows[1].birthDateDisplay).toBe("August 20, 2005");
    expect(preview.previewRows[2].birthDate).toBe("2005-08-20");
    expect(preview.previewRows[2].birthDateDisplay).toBe("August 20, 2005");
  });

  it("reads birthday from direct G-row cell metadata when the workbook stores an Excel serial date", () => {
    const workbook = createXlsxWorkbook({
      styles: [
        { numFmtCode: "0" },
        { numFmtCode: "mmmm\\ d\\,\\ yyyy" }
      ],
      sheets: [
        {
          name: MAIN_RESIDENT_SHEET_NAME,
          rows: buildPhase1Rows([
            [
              "Test Resident Direct Date",
              "Zone 14",
              "0019C",
              null,
              null,
              { type: "number", value: 38584, styleId: 1 },
              { type: "number", value: 38584, styleId: 2 },
              "Single",
              "Student",
              "House 14, Zone 14",
              "09170000008"
            ]
          ])
        }
      ]
    });

    const preview = parseExcelImportPreview(workbook, {
      includeDateDebug: true
    });

    expect(preview.errors).toEqual([]);
    expect(preview.previewRows[0]).toEqual(
      expect.objectContaining({
        birthDate: "2005-08-20",
        birthDateDisplay: "August 20, 2005",
        ignoredNeedsClarification: ["D", "E", "F"]
      })
    );
    expect(preview.dateDebug[0]).toEqual({
      rowNumber: 2,
      cellAddress: "G2",
      directCellExists: true,
      directCellVType: "string",
      directCellW: "August 20, 2005",
      directCellT: "",
      directCellZ: "mmmm\\ d\\,\\ yyyy",
      parsedBirthDate: "2005-08-20",
      parsedBirthDateDisplay: "August 20, 2005"
    });
  });

  it("does not let a self-closing blank F cell swallow the G birthday cell", () => {
    const workbook = createXlsxWorkbook({
      styles: [
        { numFmtCode: "@" },
        { numFmtCode: "mmmm\\ d\\,\\ yyyy" }
      ],
      sheets: [
        {
          name: MAIN_RESIDENT_SHEET_NAME,
          rows: buildPhase1Rows([
            [
              "Test Resident Self Closing",
              "Zone 15",
              "0020C",
              null,
              null,
              { type: "blank", styleId: 1 },
              { type: "number", value: 38584, styleId: 2 },
              "Single",
              "Student",
              "House 15, Zone 15",
              "09170000009"
            ]
          ])
        }
      ]
    });

    const preview = parseExcelImportPreview(workbook, {
      includeDateDebug: true
    });

    expect(preview.errors).toEqual([]);
    expect(preview.previewRows[0]).toEqual(
      expect.objectContaining({
        birthDate: "2005-08-20",
        birthDateDisplay: "August 20, 2005"
      })
    );
    expect(preview.dateDebug[0]).toMatchObject({
      cellAddress: "G2",
      directCellExists: true,
      directCellW: "August 20, 2005",
      parsedBirthDate: "2005-08-20"
    });
  });

  it("parses birthday text from inline date-like cells even when the cell type is not inlineStr", () => {
    const workbook = createXlsxWorkbook({
      sheets: [
        {
          name: MAIN_RESIDENT_SHEET_NAME,
          rows: buildPhase1Rows([
            [
              "Test Resident Inline Date",
              "Zone 12",
              "0017C",
              null,
              null,
              null,
              { type: "strInline", value: "August 20, 2005" },
              "Single",
              "Student",
              "House 12, Zone 12",
              "09170000006"
            ]
          ])
        }
      ]
    });

    const preview = parseExcelImportPreview(workbook);

    expect(preview.errors).toEqual([]);
    expect(preview.previewRows[0]).toEqual(
      expect.objectContaining({
        birthDate: "2005-08-20",
        birthDateDisplay: "August 20, 2005"
      })
    );
  });

  it("can include safe date debug metadata without resident identity fields", () => {
    const workbook = createXlsxWorkbook({
      styles: [{ numFmtCode: "mmmm d, yyyy" }],
      sheets: [
        {
          name: MAIN_RESIDENT_SHEET_NAME,
          rows: buildPhase1Rows([
            [
              "Test Resident Debug Date",
              "Zone 13",
              "0018C",
              null,
              null,
              null,
              { type: "date", value: "2005-08-20 00:00:00", styleId: 1 },
              "Single",
              "Student",
              "House 13, Zone 13",
              "09170000007"
            ]
          ])
        }
      ]
    });

    const preview = parseExcelImportPreview(workbook, { includeDateDebug: true });

    expect(preview.dateDebug).toEqual([
      {
        rowNumber: 2,
        cellAddress: "G2",
        directCellExists: true,
        directCellVType: "string",
        directCellW: "August 20, 2005",
        directCellT: "d",
        directCellZ: "mmmm d, yyyy",
        parsedBirthDate: "2005-08-20",
        parsedBirthDateDisplay: "August 20, 2005"
      }
    ]);
    expect(JSON.stringify(preview.dateDebug)).not.toContain("Test Resident Debug Date");
    expect(JSON.stringify(preview.dateDebug)).not.toContain("09170000007");
    expect(JSON.stringify(preview.dateDebug)).not.toContain("House 13");
  });
});
