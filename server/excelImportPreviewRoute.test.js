import request from "supertest";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createApp } from "./app.js";
import { MAIN_RESIDENT_SHEET_NAME } from "./lib/excelImportPreview.js";
import { buildPhase1Rows, createXlsxWorkbook } from "./testUtils/xlsxWorkbook.js";

const TRUSTED_ORIGIN = "https://barangay-staff.example.test";
const XLSX_CONTENT_TYPE =
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

const profileRows = {
  admin: {
    id: "admin-1",
    username: "admin",
    display_name: "Ricardo Morales",
    role: "admin",
    status: "active",
    password_hash:
      "scrypt$admin-seed-salt$8fd8c3981c564ec9a792e99f26a580fdd1485204853c59650cea36193b8f1588e338726df3e6721fbe011617bbfe06714df135942371be109c1d8779e780a842"
  },
  department: {
    id: "dept-1",
    username: "department",
    display_name: "Elena Ledesma",
    role: "department",
    status: "active",
    password_hash:
      "scrypt$department-seed-salt$d5910b629e20aa4ba66f9a07256e8acc269f2f4ba713a8b46aab166b8de71ea97fbca318438a72a178c6c572fdb5abf258bb6e2ee136b82df1da1cd8219f562c"
  },
  lupon: {
    id: "lupon-1",
    username: "lupon",
    display_name: "Juan Santos",
    role: "lupon",
    status: "active",
    password_hash:
      "scrypt$lupon-seed-salt$87a90e262f2aaa5bd1727567f438bfef2148ba4e9f6b8e1bbd70eadd19aae19d8feff17bc39443e2b4ddf4b19ec73547bc77403f81b9d2df4ab3f3dd8cfc240a"
  }
};

function createPreviewWorkbook() {
  return createXlsxWorkbook({
    sheets: [
      {
        name: MAIN_RESIDENT_SHEET_NAME,
        rows: buildPhase1Rows([
          [
            "Test Resident Foxtrot",
            "Zone 6",
            "0007A",
            "",
            "",
            "",
            "1999-09-09",
            "Single",
            "Driver",
            "House 6, Zone 6",
            "09170000006",
            "",
            "Sitio Six",
            "TAG-A",
            "Synthetic note",
            "",
            "Barangay Clearance",
            "2026-03-01"
          ]
        ])
      }
    ]
  });
}

function createCommitWorkbook(rows, sheetName = MAIN_RESIDENT_SHEET_NAME) {
  return createXlsxWorkbook({
    sheets: [
      {
        name: sheetName,
        rows: buildPhase1Rows(rows)
      },
      {
        name: "Non-Voters",
        rows: buildPhase1Rows([
          [
            "Should Not Import Non Voter",
            "Excluded Zone",
            "",
            "",
            "",
            "",
            "2000-01-01",
            "Single",
            "Excluded",
            "Excluded Address",
            "09999999999"
          ]
        ])
      }
    ]
  });
}

function createImportPool() {
  const queries = [];
  const audits = [];

  return {
    audits,
    queries,
    async query(sql, params = []) {
      queries.push({ sql, params });

      if (sql.includes("INSERT INTO audit_logs")) {
        audits.push({
          actorProfileId: params[1],
          action: params[2],
          entityType: params[3],
          entityId: params[4],
          metadata: params[5]
        });

        return { rows: [], rowCount: 1 };
      }

      if (sql.includes("FROM profiles") && sql.includes("lower(username) = $1")) {
        const profile = Object.values(profileRows).find(
          (row) => row.username === String(params[0]).toLowerCase()
        );

        return { rows: profile ? [profile] : [], rowCount: profile ? 1 : 0 };
      }

      if (sql.includes("FROM profiles") && sql.includes("WHERE id = $1")) {
        const profile = Object.values(profileRows).find((row) => row.id === params[0]);

        return { rows: profile ? [profile] : [], rowCount: profile ? 1 : 0 };
      }

      if (sql.includes("FROM residents")) {
        return {
          rows: [
            {
              id: "RBI-FAKE-0002",
              full_name: "Existing Synthetic Resident",
              birth_date: "1980-01-01",
              address: "Synthetic Address"
            }
          ],
          rowCount: 1
        };
      }

      return { rows: [], rowCount: 0 };
    }
  };
}

function createCommitPool() {
  const queries = [];
  const audits = [];
  const insertedResidents = [];
  const updatedResidents = [];
  const archivedResidents = [];
  const importBatches = [];
  const importBatchRows = [];
  const residentRows = [
    {
      id: "RBI-FAKE-0002",
      full_name: "Existing Synthetic Resident",
      birth_date: "1980-01-01",
      address: "Existing Address",
      exact_address: "Existing Address",
      sitio: "Existing Sitio",
      contact_number: "09170000008"
    }
  ];

  return {
    audits,
    archivedResidents,
    importBatches,
    importBatchRows,
    insertedResidents,
    queries,
    residentRows,
    updatedResidents,
    async query(sql, params = []) {
      queries.push({ sql, params });

      if (sql === "BEGIN" || sql === "COMMIT" || sql === "ROLLBACK") {
        return { rows: [], rowCount: 0 };
      }

      if (sql.includes("INSERT INTO audit_logs")) {
        audits.push({
          actorProfileId: params[1],
          action: params[2],
          entityType: params[3],
          entityId: params[4],
          metadata: params[5]
        });

        return { rows: [], rowCount: 1 };
      }

      if (sql.includes("FROM profiles") && sql.includes("lower(username) = $1")) {
        const profile = Object.values(profileRows).find(
          (row) => row.username === String(params[0]).toLowerCase()
        );

        return { rows: profile ? [profile] : [], rowCount: profile ? 1 : 0 };
      }

      if (sql.includes("FROM profiles") && sql.includes("WHERE id = $1")) {
        const profile = Object.values(profileRows).find((row) => row.id === params[0]);

        return { rows: profile ? [profile] : [], rowCount: profile ? 1 : 0 };
      }

      if (sql.includes("FROM residents")) {
        return {
          rows: residentRows,
          rowCount: residentRows.length
        };
      }

      if (sql.includes("INSERT INTO import_batches")) {
        importBatches.push({
          id: params[0],
          importType: params[1],
          sourceFilename: params[2],
          filename: params[3],
          sheetName: params[4],
          headerRow: params[5],
          mapping: params[6],
          defaults: params[7],
          mode: params[8],
          totalRows: params[9],
          createdByProfileId: params[10],
          rolledBackAt: null
        });

        return { rows: [], rowCount: 1 };
      }

      if (sql.includes("UPDATE import_batches") && sql.includes("rolled_back_at")) {
        const batch = importBatches.find((item) => item.id === params[0]);

        if (batch) {
          batch.rolledBackAt = "now";
        }

        return { rows: batch ? [batch] : [], rowCount: batch ? 1 : 0 };
      }

      if (sql.includes("UPDATE import_batches")) {
        const batch = importBatches.find((item) => item.id === params[2]);

        if (batch) {
          batch.status = "completed";
          batch.successfulRows = params[0];
          batch.failedRows = params[1];
        }

        return { rows: [], rowCount: 1 };
      }

      if (sql.includes("INSERT INTO import_batch_rows")) {
        const batchRow = {
          id: params[0],
          importBatchId: params[1],
          batchId: params[2],
          rowNumber: params[3],
          residentId: params[4],
          action: params[5],
          previousValues: params[6],
          newValues: params[7],
          status: params[8],
          createdRecordType: params[9],
          createdRecordId: params[10]
        };

        importBatchRows.push(batchRow);
        return { rows: [], rowCount: 1 };
      }

      if (sql.includes("INSERT INTO residents")) {
        const resident = {
          id: params[0],
          householdId: params[1],
          fullName: params[2],
          birthDate: params[3],
          gender: params[4],
          civilStatus: params[5],
          occupation: params[6],
          address: params[7],
          exactAddress: params[8],
          contactNumber: params[9],
          email: params[10],
          additionalInformation: params[11],
          sectors: params[12],
          registeredVoter: params[13],
          precinctNumber: params[14],
          sitio: params[15],
          statusColor: params[16]
        };

        insertedResidents.push(resident);
        residentRows.push({
          id: resident.id,
          full_name: resident.fullName,
          birth_date: resident.birthDate,
          address: resident.address,
          exact_address: resident.exactAddress,
          contact_number: resident.contactNumber,
          archived_at: null
        });

        return { rows: [resident], rowCount: 1 };
      }

      if (sql.includes("UPDATE residents") && sql.includes("archived_at = now()")) {
        const resident = residentRows.find((row) => row.id === params[0]);

        if (resident) {
          resident.archived_at = "now";
          archivedResidents.push(resident.id);
        }

        return { rows: resident ? [resident] : [], rowCount: resident ? 1 : 0 };
      }

      if (sql.includes("UPDATE residents") && sql.includes("full_name = $1")) {
        const resident = residentRows.find((row) => row.id === params[10]);

        if (resident) {
          resident.full_name = params[0];
          resident.address = params[1];
          resident.exact_address = params[2];
          resident.precinct_number = params[3];
          resident.birth_date = params[4];
          resident.civil_status = params[5];
          resident.occupation = params[6];
          resident.contact_number = params[7];
          resident.sitio = params[8];
          resident.additional_information = params[9];
          updatedResidents.push({ ...resident });
        }

        return { rows: resident ? [resident] : [], rowCount: resident ? 1 : 0 };
      }

      if (sql.includes("SELECT") && sql.includes("FROM import_batches")) {
        const batch = importBatches.find((item) => item.id === params[0]);

        return {
          rows: batch
            ? [
                {
                  id: batch.id,
                  rolled_back_at: batch.rolledBackAt
                }
              ]
            : [],
          rowCount: batch ? 1 : 0
        };
      }

      if (sql.includes("FROM import_batch_rows")) {
        const rows = importBatchRows
          .filter((row) => row.batchId === params[0])
          .map((row) => ({
            resident_id: row.residentId,
            action: row.action,
            previous_values: row.previousValues,
            new_values: row.newValues,
            row_number: row.rowNumber
          }));

        return { rows, rowCount: rows.length };
      }

      if (sql.includes("INSERT INTO resident_status_history")) {
        return { rows: [], rowCount: 1 };
      }

      return { rows: [], rowCount: 0 };
    }
  };
}

async function loginAs(app, username, password) {
  const response = await request(app)
    .post("/api/auth/login")
    .set("Origin", TRUSTED_ORIGIN)
    .send({ username, password });

  expect(response.status, JSON.stringify(response.body)).toBe(200);

  return response.headers["set-cookie"];
}

beforeEach(() => {
  vi.stubEnv("AUTH_SESSION_SECRET", "test-auth-session-secret");
  vi.stubEnv("CORS_ORIGINS", TRUSTED_ORIGIN);
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("Excel import preview route", () => {
  it("returns workbook sheet names without reading resident data", async () => {
    const pool = createImportPool();
    const app = createApp(pool);
    const cookie = await loginAs(app, "admin", "admin123");
    const workbook = createXlsxWorkbook({
      sheets: [
        {
          name: "Imported Residents",
          rows: buildPhase1Rows([])
        },
        {
          name: "Alternate Import",
          rows: buildPhase1Rows([])
        }
      ]
    });

    const response = await request(app)
      .post("/api/admin/excel-import/sheets")
      .set("Cookie", cookie)
      .set("Origin", TRUSTED_ORIGIN)
      .set("Content-Type", XLSX_CONTENT_TYPE)
      .set("X-File-Name", "phase1-fake.xlsx")
      .send(workbook);

    expect(response.status, JSON.stringify(response.body)).toBe(200);
    expect(response.body).toEqual({
      sheetNames: ["Imported Residents", "Alternate Import"],
      defaultSelectedSheet: "Imported Residents"
    });
    expect(pool.queries.some((query) => query.sql.includes("FROM residents"))).toBe(false);
  });

  it("returns selected worksheet headers from a custom header row", async () => {
    const pool = createImportPool();
    const app = createApp(pool);
    const cookie = await loginAs(app, "admin", "admin123");
    const workbook = createXlsxWorkbook({
      sheets: [
        {
          name: "Alternate Import",
          rows: [
            ["Report"],
            ["First Name", "Last Name", "Exact Address"],
            ["Juan", "Dela Cruz", "House 1"]
          ]
        }
      ]
    });

    const response = await request(app)
      .post("/api/admin/excel-import/headers")
      .set("Cookie", cookie)
      .set("Origin", TRUSTED_ORIGIN)
      .set("Content-Type", XLSX_CONTENT_TYPE)
      .set("X-File-Name", "phase1-fake.xlsx")
      .set("X-Sheet-Name", encodeURIComponent("Alternate Import"))
      .set("X-Header-Row", "2")
      .send(workbook);

    expect(response.status, JSON.stringify(response.body)).toBe(200);
    expect(response.body).toEqual({
      sheetName: "Alternate Import",
      workbookSheetNames: ["Alternate Import"],
      headerRowNumber: 2,
      headers: [
        { column: "A", header: "First Name", field: "" },
        { column: "B", header: "Last Name", field: "" },
        { column: "C", header: "Exact Address", field: "" }
      ]
    });
    expect(pool.queries.some((query) => query.sql.includes("FROM residents"))).toBe(false);
  });

  it("allows Admin users to preview a fake .xlsx workbook without inserting residents", async () => {
    const pool = createImportPool();
    const app = createApp(pool);
    const cookie = await loginAs(app, "admin", "admin123");

    const response = await request(app)
      .post("/api/admin/excel-import/preview")
      .set("Cookie", cookie)
      .set("Origin", TRUSTED_ORIGIN)
      .set("Content-Type", XLSX_CONTENT_TYPE)
      .set("X-File-Name", "phase1-fake.xlsx")
      .send(createPreviewWorkbook());

    expect(response.status, JSON.stringify(response.body)).toBe(200);
    expect(response.body).toMatchObject({
      sheetName: MAIN_RESIDENT_SHEET_NAME,
      workbookSheetNames: [MAIN_RESIDENT_SHEET_NAME],
      totalRowsDetected: 1,
      previewRows: [
        expect.objectContaining({
          fullName: "Test Resident Foxtrot",
          contactNumber: "09170000006",
          precinctNo: "0007A"
        })
      ],
      errors: []
    });
    expect(response.body.documentRequestPairsDetected).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          assistanceColumn: "Q",
          dateColumn: "R"
        })
      ])
    );
    expect(response.body).not.toHaveProperty("dateDebug");
    expect(pool.queries.some((query) => query.sql.includes("INSERT INTO residents"))).toBe(false);
    expect(pool.queries.some((query) => query.sql.includes("INSERT INTO document_requests"))).toBe(
      false
    );
    expect(pool.audits).toEqual([
      expect.objectContaining({
        actorProfileId: "admin-1",
        action: "excel_import.preview_created",
        entityType: "excel_import_preview",
        metadata: expect.objectContaining({
          actorRole: "admin",
          sourceFilename: "phase1-fake.xlsx",
          totalRowsDetected: 1
        })
      })
    ]);
    expect(JSON.stringify(pool.audits)).not.toContain("Test Resident Foxtrot");
    expect(JSON.stringify(pool.audits)).not.toContain("09170000006");
  });

  it("previews a user-selected alternate worksheet", async () => {
    const pool = createImportPool();
    const app = createApp(pool);
    const cookie = await loginAs(app, "admin", "admin123");
    const workbook = createXlsxWorkbook({
      sheets: [
        {
          name: MAIN_RESIDENT_SHEET_NAME,
          rows: buildPhase1Rows([
            ["Default Sheet Resident", "Zone 1", "", "", "", "", "", "Single"]
          ])
        },
        {
          name: "Alternate Import",
          rows: buildPhase1Rows([
            ["Alternate Sheet Resident", "Zone 2", "", "", "", "", "", "Single"]
          ])
        }
      ]
    });

    const response = await request(app)
      .post("/api/admin/excel-import/preview")
      .set("Cookie", cookie)
      .set("Origin", TRUSTED_ORIGIN)
      .set("Content-Type", XLSX_CONTENT_TYPE)
      .set("X-File-Name", "phase1-fake.xlsx")
      .set("X-Sheet-Name", encodeURIComponent("Alternate Import"))
      .send(workbook);

    expect(response.status, JSON.stringify(response.body)).toBe(200);
    expect(response.body.sheetName).toBe("Alternate Import");
    expect(response.body.workbookSheetNames).toEqual([MAIN_RESIDENT_SHEET_NAME, "Alternate Import"]);
    expect(response.body.previewRows[0].fullName).toBe("Alternate Sheet Resident");
  });

  it("rejects preview when the selected worksheet is missing", async () => {
    const pool = createImportPool();
    const app = createApp(pool);
    const cookie = await loginAs(app, "admin", "admin123");

    const response = await request(app)
      .post("/api/admin/excel-import/preview")
      .set("Cookie", cookie)
      .set("Origin", TRUSTED_ORIGIN)
      .set("Content-Type", XLSX_CONTENT_TYPE)
      .set("X-File-Name", "phase1-fake.xlsx")
      .set("X-Sheet-Name", encodeURIComponent("Missing Sheet"))
      .send(createCommitWorkbook([], "Imported Residents"));

    expect(response.status).toBe(400);
    expect(response.body.error).toContain('Sheet "Missing Sheet" was not found');
    expect(response.body.error).toContain("Imported Residents");
    expect(pool.audits).toEqual([]);
  });

  it("can include safe date debug metadata in non-production when explicitly enabled", async () => {
    vi.stubEnv("EXCEL_IMPORT_DEBUG_DATES", "true");
    const pool = createImportPool();
    const app = createApp(pool);
    const cookie = await loginAs(app, "admin", "admin123");

    const response = await request(app)
      .post("/api/admin/excel-import/preview")
      .set("Cookie", cookie)
      .set("Origin", TRUSTED_ORIGIN)
      .set("Content-Type", XLSX_CONTENT_TYPE)
      .set("X-File-Name", "phase1-fake.xlsx")
      .send(createPreviewWorkbook());

    expect(response.status, JSON.stringify(response.body)).toBe(200);
    expect(response.body.dateDebug).toEqual([
      expect.objectContaining({
        rowNumber: 2,
        cellAddress: "G2",
        directCellExists: true,
        parsedBirthDate: "1999-09-09"
      })
    ]);
    expect(JSON.stringify(response.body.dateDebug)).not.toContain("Test Resident Foxtrot");
    expect(JSON.stringify(response.body.dateDebug)).not.toContain("09170000006");
    expect(JSON.stringify(response.body.dateDebug)).not.toContain("House 6");
  });

  it("blocks Department and Lupon users before workbook parsing or resident lookup", async () => {
    for (const [username, password] of [
      ["department", "dept123"],
      ["lupon", "lupon123"]
    ]) {
      const pool = createImportPool();
      const app = createApp(pool);
      const cookie = await loginAs(app, username, password);

      const response = await request(app)
        .post("/api/admin/excel-import/preview")
        .set("Cookie", cookie)
        .set("Origin", TRUSTED_ORIGIN)
        .set("Content-Type", XLSX_CONTENT_TYPE)
        .set("X-File-Name", "phase1-fake.xlsx")
        .send(createPreviewWorkbook());

      expect(response.status).toBe(403);
      expect(pool.queries.some((query) => query.sql.includes("FROM residents"))).toBe(false);
      expect(pool.audits).toEqual([]);
    }
  });

  it("rejects CSV uploads for this phase", async () => {
    const pool = createImportPool();
    const app = createApp(pool);
    const cookie = await loginAs(app, "admin", "admin123");

    const response = await request(app)
      .post("/api/admin/excel-import/preview")
      .set("Cookie", cookie)
      .set("Origin", TRUSTED_ORIGIN)
      .set("Content-Type", "text/csv")
      .set("X-File-Name", "phase1-fake.csv")
      .send("fullName,address\nSynthetic Person,Synthetic Address");

    expect(response.status).toBe(415);
    expect(response.body.error).toContain(".xlsx");
    expect(pool.queries.some((query) => query.sql.includes("FROM residents"))).toBe(false);
    expect(pool.audits).toEqual([]);
  });
});

describe("Excel import commit route", () => {
  it("allows local development preflight requests with commit confirmation headers", async () => {
    vi.stubEnv("NODE_ENV", "development");
    const pool = createCommitPool();
    const app = createApp(pool);

    const response = await request(app)
      .options("/api/admin/excel-import/commit")
      .set("Origin", "http://localhost:5173")
      .set("Access-Control-Request-Method", "POST")
      .set(
        "Access-Control-Request-Headers",
        "Content-Type, X-File-Name, X-Import-Confirmed, X-Backup-Confirmed"
      );

    expect(response.status).toBe(204);
    expect(response.headers["access-control-allow-origin"]).toBe("http://localhost:5173");
    expect(response.headers["access-control-allow-credentials"]).toBe("true");
    expect(response.headers["access-control-allow-methods"]).toContain("POST");
    expect(response.headers["access-control-allow-methods"]).toContain("OPTIONS");
    expect(response.headers["access-control-allow-headers"]).toContain("Content-Type");
    expect(response.headers["access-control-allow-headers"]).toContain("X-File-Name");
    expect(response.headers["access-control-allow-headers"]).toContain("X-Import-Confirmed");
    expect(response.headers["access-control-allow-headers"]).toContain("X-Backup-Confirmed");
    expect(pool.queries).toEqual([]);
  });

  it("keeps trusted-origin protection on actual commit POST requests", async () => {
    const pool = createCommitPool();
    const app = createApp(pool);
    const cookie = await loginAs(app, "admin", "admin123");

    const response = await request(app)
      .post("/api/admin/excel-import/commit")
      .set("Cookie", cookie)
      .set("Content-Type", XLSX_CONTENT_TYPE)
      .set("X-File-Name", "phase1-fake.xlsx")
      .set("X-Import-Confirmed", "true")
      .set("X-Backup-Confirmed", "true")
      .send(createCommitWorkbook([]));

    expect(response.status).toBe(403);
    expect(response.body.error).toContain("trusted origin");
    expect(pool.queries.some((query) => query.sql.includes("FROM residents"))).toBe(false);
    expect(pool.insertedResidents).toEqual([]);
    expect(pool.audits).toEqual([]);
  });

  it("requires explicit Admin and backup confirmation before parsing the workbook", async () => {
    const pool = createCommitPool();
    const app = createApp(pool);
    const cookie = await loginAs(app, "admin", "admin123");

    const response = await request(app)
      .post("/api/admin/excel-import/commit")
      .set("Cookie", cookie)
      .set("Origin", TRUSTED_ORIGIN)
      .set("Content-Type", XLSX_CONTENT_TYPE)
      .set("X-File-Name", "phase1-fake.xlsx")
      .send(createCommitWorkbook([]));

    expect(response.status).toBe(400);
    expect(response.body.error).toContain("confirmation");
    expect(pool.queries.some((query) => query.sql.includes("FROM residents"))).toBe(false);
    expect(pool.insertedResidents).toEqual([]);
    expect(pool.audits).toEqual([]);
  });

  it("requires backup acknowledgement before commit", async () => {
    const pool = createCommitPool();
    const app = createApp(pool);
    const cookie = await loginAs(app, "admin", "admin123");

    const response = await request(app)
      .post("/api/admin/excel-import/commit")
      .set("Cookie", cookie)
      .set("Origin", TRUSTED_ORIGIN)
      .set("Content-Type", XLSX_CONTENT_TYPE)
      .set("X-File-Name", "phase1-fake.xlsx")
      .set("X-Import-Confirmed", "true")
      .send(createCommitWorkbook([]));

    expect(response.status).toBe(400);
    expect(response.body.error).toContain("backup");
    expect(pool.queries.some((query) => query.sql.includes("FROM residents"))).toBe(false);
    expect(pool.insertedResidents).toEqual([]);
    expect(pool.audits).toEqual([]);
  });

  it("blocks Department and Lupon users before workbook parsing or resident lookup", async () => {
    for (const [username, password] of [
      ["department", "dept123"],
      ["lupon", "lupon123"]
    ]) {
      const pool = createCommitPool();
      const app = createApp(pool);
      const cookie = await loginAs(app, username, password);

      const response = await request(app)
        .post("/api/admin/excel-import/commit")
        .set("Cookie", cookie)
        .set("Origin", TRUSTED_ORIGIN)
        .set("Content-Type", XLSX_CONTENT_TYPE)
        .set("X-File-Name", "phase1-fake.xlsx")
        .set("X-Import-Confirmed", "true")
        .set("X-Backup-Confirmed", "true")
        .send(createCommitWorkbook([]));

      expect(response.status).toBe(403);
      expect(pool.queries.some((query) => query.sql.includes("FROM residents"))).toBe(false);
      expect(pool.insertedResidents).toEqual([]);
      expect(pool.audits).toEqual([]);
    }
  });

  it("re-parses the uploaded workbook, saves only valid non-duplicate rows, and returns a summary", async () => {
    const pool = createCommitPool();
    const app = createApp(pool);
    const cookie = await loginAs(app, "admin", "admin123");
    const workbook = createCommitWorkbook([
      [
        "New Synthetic Resident",
        "Zone 6",
        "0007A",
        "do not import d",
        "do not import e",
        "do not import f",
        "1999-09-09",
        "Single",
        "Driver",
        "House 6, Zone 6",
        "09170000006",
        "skip social",
        "Sitio Six",
        "TAG-A",
        "Synthetic note",
        "",
        "Barangay Clearance",
        "2026-03-01"
      ],
      [
        "Existing Synthetic Resident",
        "Other Zone",
        "0008B",
        "",
        "",
        "",
        "1980-01-01",
        "Married",
        "Vendor",
        "Existing Address",
        "09170000008"
      ],
      ["", "Missing Name Zone", "", "", "", "", "", "Single"]
    ]);

    const response = await request(app)
      .post("/api/admin/excel-import/commit")
      .set("Cookie", cookie)
      .set("Origin", TRUSTED_ORIGIN)
      .set("Content-Type", XLSX_CONTENT_TYPE)
      .set("X-File-Name", "phase1-fake.xlsx")
      .set("X-Import-Confirmed", "true")
      .set("X-Backup-Confirmed", "true")
      .set("X-Client-Preview-Rows", JSON.stringify([{ rowNumber: 2, fullName: "Tampered" }]))
      .send(workbook);

    expect(response.status, JSON.stringify(response.body)).toBe(200);
    expect(response.body.summary).toEqual(
      expect.objectContaining({
        rowsDetected: 3,
        created: 1,
        skippedDuplicates: 1,
        failedValidation: 1,
        documentHistoryCreated: 0,
        documentHistoryDeferred: 1,
        sourceFilename: "phase1-fake.xlsx",
        sheetName: MAIN_RESIDENT_SHEET_NAME
      })
    );
    expect(response.body.summary.importBatchId).toMatch(/^IMP-/);

    expect(pool.insertedResidents).toEqual([
      expect.objectContaining({
        fullName: "New Synthetic Resident",
        birthDate: "1999-09-09",
        civilStatus: "Single",
        occupation: "Driver",
        address: "House 6, Zone 6",
        contactNumber: "09170000006",
        precinctNumber: "0007A",
        registeredVoter: true,
        statusColor: "green"
      })
    ]);
    expect(pool.insertedResidents[0].householdId).toMatch(/^HH-IMPORT-/);
    expect(pool.insertedResidents[0].gender).toBe("");
    expect(pool.insertedResidents[0].additionalInformation).toBe("Synthetic note");
    expect(JSON.stringify(pool.insertedResidents)).not.toContain("skip social");
    expect(JSON.stringify(pool.insertedResidents)).not.toContain("do not import d");
    expect(JSON.stringify(pool.insertedResidents)).not.toContain("do not import e");
    expect(JSON.stringify(pool.insertedResidents)).not.toContain("do not import f");
    expect(JSON.stringify(pool.insertedResidents)).not.toContain("Should Not Import Non Voter");
    expect(pool.queries.some((query) => query.sql.includes("INSERT INTO document_requests"))).toBe(
      false
    );
    expect(pool.importBatches[0]).toEqual(
      expect.objectContaining({
        importType: "residents_phase1_excel",
        sourceFilename: "phase1-fake.xlsx",
        totalRows: 3,
        successfulRows: 1,
        failedRows: 2,
        createdByProfileId: "admin-1"
      })
    );
    expect(pool.audits).toEqual([
      expect.objectContaining({
        actorProfileId: "admin-1",
        action: "excel_import.committed",
        entityType: "import_batch",
        entityId: response.body.summary.importBatchId,
        metadata: expect.objectContaining({
          actorRole: "admin",
          rowsDetected: 3,
          created: 1,
          skippedDuplicates: 1,
          failedValidation: 1,
          documentHistoryCreated: 0,
          documentHistoryDeferred: 1,
          backupConfirmed: true
        })
      })
    ]);
    expect(JSON.stringify(pool.audits)).not.toContain("New Synthetic Resident");
    expect(JSON.stringify(pool.audits)).not.toContain("09170000006");
    expect(JSON.stringify(pool.audits)).not.toContain("House 6");
    expect(JSON.stringify(pool.audits)).not.toContain("skip social");
  });

  it("commits the user-selected alternate worksheet", async () => {
    const pool = createCommitPool();
    const app = createApp(pool);
    const cookie = await loginAs(app, "admin", "admin123");
    const workbook = createXlsxWorkbook({
      sheets: [
        {
          name: MAIN_RESIDENT_SHEET_NAME,
          rows: buildPhase1Rows([
            ["Default Sheet Resident", "Zone 1", "", "", "", "", "", "Single"]
          ])
        },
        {
          name: "Alternate Import",
          rows: buildPhase1Rows([
            [
              "Alternate Commit Resident",
              "Zone 2",
              "",
              "",
              "",
              "",
              "",
              "Single",
              "Vendor",
              "House 2",
              "09170000022"
            ]
          ])
        }
      ]
    });

    const response = await request(app)
      .post("/api/admin/excel-import/commit")
      .set("Cookie", cookie)
      .set("Origin", TRUSTED_ORIGIN)
      .set("Content-Type", XLSX_CONTENT_TYPE)
      .set("X-File-Name", "phase1-fake.xlsx")
      .set("X-Sheet-Name", encodeURIComponent("Alternate Import"))
      .set("X-Import-Confirmed", "true")
      .set("X-Backup-Confirmed", "true")
      .send(workbook);

    expect(response.status, JSON.stringify(response.body)).toBe(200);
    expect(response.body.summary).toMatchObject({
      sheetName: "Alternate Import",
      rowsDetected: 1,
      created: 1
    });
    expect(pool.insertedResidents).toEqual([
      expect.objectContaining({
        fullName: "Alternate Commit Resident"
      })
    ]);
  });

  it("commits using the same selected mapping as preview", async () => {
    const pool = createCommitPool();
    const app = createApp(pool);
    const cookie = await loginAs(app, "admin", "admin123");
    const columnMapping = {
      firstName: "B",
      lastName: "A",
      exactAddress: "C",
      voterStatus: "D"
    };
    const workbook = createXlsxWorkbook({
      sheets: [
        {
          name: "Non Voters",
          rows: [
            ["Last", "First", "Address", "Voter Status"],
            ["Bautista", "Pedro", "House 4", "Non-voter"]
          ]
        }
      ]
    });

    const response = await request(app)
      .post("/api/admin/excel-import/commit")
      .set("Cookie", cookie)
      .set("Origin", TRUSTED_ORIGIN)
      .set("Content-Type", XLSX_CONTENT_TYPE)
      .set("X-File-Name", "phase1-fake.xlsx")
      .set("X-Sheet-Name", encodeURIComponent("Non Voters"))
      .set("X-Header-Row", "1")
      .set("X-Column-Mapping", encodeURIComponent(JSON.stringify(columnMapping)))
      .set("X-Import-Confirmed", "true")
      .set("X-Backup-Confirmed", "true")
      .send(workbook);

    expect(response.status, JSON.stringify(response.body)).toBe(200);
    expect(response.body.summary).toMatchObject({
      sheetName: "Non Voters",
      rowsDetected: 1,
      created: 1
    });
    expect(pool.insertedResidents).toEqual([
      expect.objectContaining({
        fullName: "Pedro Bautista",
        address: "House 4",
        registeredVoter: false,
        sectors: []
      })
    ]);
  });

  it("skips detected duplicates in skipDuplicates mode and logs batch rows", async () => {
    const pool = createCommitPool();
    const app = createApp(pool);
    const cookie = await loginAs(app, "admin", "admin123");

    const response = await request(app)
      .post("/api/admin/excel-import/commit")
      .set("Cookie", cookie)
      .set("Origin", TRUSTED_ORIGIN)
      .set("Content-Type", XLSX_CONTENT_TYPE)
      .set("X-File-Name", "phase1-fake.xlsx")
      .set("X-Import-Mode", "skipDuplicates")
      .set("X-Import-Confirmed", "true")
      .set("X-Backup-Confirmed", "true")
      .send(
        createCommitWorkbook([
          [
            "Existing Synthetic Resident",
            "Other Zone",
            "",
            "",
            "",
            "",
            "1980-01-01",
            "Single",
            "Vendor",
            "Existing Address",
            "09170000008"
          ],
          [
            "Unique Batch Resident",
            "Zone 20",
            "",
            "",
            "",
            "",
            "1995-05-20",
            "Single",
            "Teacher",
            "House 20",
            "09170000020"
          ]
        ])
      );

    expect(response.status, JSON.stringify(response.body)).toBe(200);
    expect(response.body.summary).toMatchObject({
      rowsDetected: 2,
      created: 1,
      updated: 0,
      skippedDuplicates: 1,
      importMode: "skipDuplicates"
    });
    expect(pool.insertedResidents).toEqual([
      expect.objectContaining({
        fullName: "Unique Batch Resident"
      })
    ]);
    expect(pool.importBatchRows).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          action: "skipped_duplicate",
          residentId: "RBI-FAKE-0002",
          status: "imported",
          rowNumber: 2
        }),
        expect.objectContaining({
          action: "created",
          status: "imported",
          rowNumber: 3
        })
      ])
    );
    expect(JSON.stringify(pool.importBatchRows)).not.toContain("lupon");
  });

  it("updates matched residents in updateMatches mode and logs previous values", async () => {
    const pool = createCommitPool();
    const app = createApp(pool);
    const cookie = await loginAs(app, "admin", "admin123");

    const response = await request(app)
      .post("/api/admin/excel-import/commit")
      .set("Cookie", cookie)
      .set("Origin", TRUSTED_ORIGIN)
      .set("Content-Type", XLSX_CONTENT_TYPE)
      .set("X-File-Name", "phase1-fake.xlsx")
      .set("X-Import-Mode", "updateMatches")
      .set("X-Import-Confirmed", "true")
      .set("X-Backup-Confirmed", "true")
      .send(
        createCommitWorkbook([
          [
            "Existing Synthetic Resident",
            "Zone Updated",
            "",
            "",
            "",
            "",
            "1980-01-01",
            "Married",
            "Updated Work",
            "Updated Address",
            "09179999999"
          ]
        ])
      );

    expect(response.status, JSON.stringify(response.body)).toBe(200);
    expect(response.body.summary).toMatchObject({
      rowsDetected: 1,
      created: 0,
      updated: 1,
      skippedDuplicates: 0,
      importMode: "updateMatches"
    });
    expect(pool.updatedResidents).toEqual([
      expect.objectContaining({
        id: "RBI-FAKE-0002",
        exact_address: "Updated Address",
        contact_number: "09179999999"
      })
    ]);
    expect(pool.importBatchRows).toEqual([
      expect.objectContaining({
        action: "updated",
        residentId: "RBI-FAKE-0002",
        status: "imported",
        previousValues: expect.objectContaining({
          exactAddress: "Existing Address",
          contactNumber: "09170000008"
        }),
        newValues: expect.objectContaining({
          exactAddress: "Updated Address",
          contactNumber: "09179999999"
        })
      })
    ]);
  });

  it("undoes created records by archiving residents from the batch", async () => {
    const pool = createCommitPool();
    const app = createApp(pool);
    const cookie = await loginAs(app, "admin", "admin123");
    const commitResponse = await request(app)
      .post("/api/admin/excel-import/commit")
      .set("Cookie", cookie)
      .set("Origin", TRUSTED_ORIGIN)
      .set("Content-Type", XLSX_CONTENT_TYPE)
      .set("X-File-Name", "phase1-fake.xlsx")
      .set("X-Import-Confirmed", "true")
      .set("X-Backup-Confirmed", "true")
      .send(createCommitWorkbook([["Undo Created Resident", "Zone 1", "", "", "", "", "", "Single", "", "Undo House"]]));

    const undoResponse = await request(app)
      .post(`/api/admin/excel-import/batches/${commitResponse.body.summary.importBatchId}/undo`)
      .set("Cookie", cookie)
      .set("Origin", TRUSTED_ORIGIN)
      .send({});

    expect(undoResponse.status, JSON.stringify(undoResponse.body)).toBe(200);
    expect(undoResponse.body.summary).toMatchObject({
      archivedCreated: 1,
      restoredUpdated: 0
    });
    expect(pool.archivedResidents).toEqual([pool.insertedResidents[0].id]);
  });

  it("undoes updated records by restoring previous values", async () => {
    const pool = createCommitPool();
    const app = createApp(pool);
    const cookie = await loginAs(app, "admin", "admin123");
    const commitResponse = await request(app)
      .post("/api/admin/excel-import/commit")
      .set("Cookie", cookie)
      .set("Origin", TRUSTED_ORIGIN)
      .set("Content-Type", XLSX_CONTENT_TYPE)
      .set("X-File-Name", "phase1-fake.xlsx")
      .set("X-Import-Mode", "updateMatches")
      .set("X-Import-Confirmed", "true")
      .set("X-Backup-Confirmed", "true")
      .send(createCommitWorkbook([["Existing Synthetic Resident", "Zone", "", "", "", "", "1980-01-01", "Single", "", "Updated Address"]]));

    const undoResponse = await request(app)
      .post(`/api/admin/excel-import/batches/${commitResponse.body.summary.importBatchId}/undo`)
      .set("Cookie", cookie)
      .set("Origin", TRUSTED_ORIGIN)
      .send({});

    expect(undoResponse.status, JSON.stringify(undoResponse.body)).toBe(200);
    expect(undoResponse.body.summary).toMatchObject({
      archivedCreated: 0,
      restoredUpdated: 1
    });
    expect(pool.residentRows.find((row) => row.id === "RBI-FAKE-0002")).toMatchObject({
      exact_address: "Existing Address",
      contact_number: "09170000008"
    });
  });

  it("does not allow the same import batch to be undone twice", async () => {
    const pool = createCommitPool();
    const app = createApp(pool);
    const cookie = await loginAs(app, "admin", "admin123");
    const commitResponse = await request(app)
      .post("/api/admin/excel-import/commit")
      .set("Cookie", cookie)
      .set("Origin", TRUSTED_ORIGIN)
      .set("Content-Type", XLSX_CONTENT_TYPE)
      .set("X-File-Name", "phase1-fake.xlsx")
      .set("X-Import-Confirmed", "true")
      .set("X-Backup-Confirmed", "true")
      .send(createCommitWorkbook([["Undo Once Resident", "Zone 1", "", "", "", "", "", "Single", "", "Undo House"]]));
    const batchId = commitResponse.body.summary.importBatchId;

    await request(app)
      .post(`/api/admin/excel-import/batches/${batchId}/undo`)
      .set("Cookie", cookie)
      .set("Origin", TRUSTED_ORIGIN)
      .send({});
    const secondUndo = await request(app)
      .post(`/api/admin/excel-import/batches/${batchId}/undo`)
      .set("Cookie", cookie)
      .set("Origin", TRUSTED_ORIGIN)
      .send({});

    expect(secondUndo.status).toBe(409);
    expect(secondUndo.body.error).toContain("already been undone");
  });

  it("blocks Department and Lupon users from import batch undo", async () => {
    for (const [username, password] of [
      ["department", "dept123"],
      ["lupon", "lupon123"]
    ]) {
      const pool = createCommitPool();
      const app = createApp(pool);
      const cookie = await loginAs(app, username, password);

      const response = await request(app)
        .post("/api/admin/excel-import/batches/IMP-FAKE/undo")
        .set("Cookie", cookie)
        .set("Origin", TRUSTED_ORIGIN)
        .send({});

      expect(response.status).toBe(403);
      expect(pool.archivedResidents).toEqual([]);
      expect(pool.updatedResidents).toEqual([]);
    }
  });

  it("does not trust client-edited preview rows when the committed workbook fails validation", async () => {
    const pool = createCommitPool();
    const app = createApp(pool);
    const cookie = await loginAs(app, "admin", "admin123");

    const response = await request(app)
      .post("/api/admin/excel-import/commit")
      .set("Cookie", cookie)
      .set("Origin", TRUSTED_ORIGIN)
      .set("Content-Type", XLSX_CONTENT_TYPE)
      .set("X-File-Name", "phase1-fake.xlsx")
      .set("X-Import-Confirmed", "true")
      .set("X-Backup-Confirmed", "true")
      .set("X-Client-Preview-Rows", JSON.stringify([{ rowNumber: 2, fullName: "Fixed Name" }]))
      .send(createCommitWorkbook([["", "Zone 9", "", "", "", "", "", "Single"]]));

    expect(response.status, JSON.stringify(response.body)).toBe(200);
    expect(response.body.summary).toEqual(
      expect.objectContaining({
        rowsDetected: 1,
        created: 0,
        skippedDuplicates: 0,
        failedValidation: 1
      })
    );
    expect(pool.insertedResidents).toEqual([]);
  });

  it("does not let an invalid row cause a later valid source duplicate to be skipped", async () => {
    const pool = createCommitPool();
    const app = createApp(pool);
    const cookie = await loginAs(app, "admin", "admin123");

    const response = await request(app)
      .post("/api/admin/excel-import/commit")
      .set("Cookie", cookie)
      .set("Origin", TRUSTED_ORIGIN)
      .set("Content-Type", XLSX_CONTENT_TYPE)
      .set("X-File-Name", "phase1-fake.xlsx")
      .set("X-Import-Confirmed", "true")
      .set("X-Backup-Confirmed", "true")
      .send(
        createCommitWorkbook([
          [
            "Later Valid Resident",
            "",
            "",
            "",
            "",
            "",
            "1991-01-01",
            "Single",
            "Vendor"
          ],
          [
            "Later Valid Resident",
            "Zone 10",
            "",
            "",
            "",
            "",
            "1991-01-01",
            "Single",
            "Vendor",
            "House 10, Zone 10",
            "09170000010"
          ]
        ])
      );

    expect(response.status, JSON.stringify(response.body)).toBe(200);
    expect(response.body.summary).toEqual(
      expect.objectContaining({
        rowsDetected: 2,
        created: 1,
        skippedDuplicates: 0,
        failedValidation: 1
      })
    );
    expect(pool.insertedResidents).toEqual([
      expect.objectContaining({
        fullName: "Later Valid Resident",
        address: "House 10, Zone 10"
      })
    ]);
  });

  it("skips rows when full name and exact address match without birthdate", async () => {
    const pool = createCommitPool();
    const app = createApp(pool);
    const cookie = await loginAs(app, "admin", "admin123");

    const response = await request(app)
      .post("/api/admin/excel-import/commit")
      .set("Cookie", cookie)
      .set("Origin", TRUSTED_ORIGIN)
      .set("Content-Type", XLSX_CONTENT_TYPE)
      .set("X-File-Name", "phase1-fake.xlsx")
      .set("X-Import-Confirmed", "true")
      .set("X-Backup-Confirmed", "true")
      .send(
        createCommitWorkbook([
          [
            "Existing Synthetic Resident",
            "Zone 12",
            "",
            "",
            "",
            "",
            "",
            "Single",
            "Vendor",
            "Existing Address",
            "09999999999"
          ]
        ])
      );

    expect(response.status, JSON.stringify(response.body)).toBe(200);
    expect(response.body.summary).toEqual(
      expect.objectContaining({
        rowsDetected: 1,
        created: 0,
        skippedDuplicates: 1,
        failedValidation: 0
      })
    );
    expect(pool.insertedResidents).toEqual([]);
  });

  it("skips possible duplicates when only the resident name matches", async () => {
    const pool = createCommitPool();
    const app = createApp(pool);
    const cookie = await loginAs(app, "admin", "admin123");

    const response = await request(app)
      .post("/api/admin/excel-import/commit")
      .set("Cookie", cookie)
      .set("Origin", TRUSTED_ORIGIN)
      .set("Content-Type", XLSX_CONTENT_TYPE)
      .set("X-File-Name", "phase1-fake.xlsx")
      .set("X-Import-Confirmed", "true")
      .set("X-Backup-Confirmed", "true")
      .send(
        createCommitWorkbook([
          [
            "Existing Synthetic Resident",
            "Zone 13",
            "",
            "",
            "",
            "",
            "",
            "Single",
            "Vendor",
            "Different Address",
            "09170000008"
          ]
        ])
      );

    expect(response.status, JSON.stringify(response.body)).toBe(200);
    expect(response.body.summary).toEqual(
      expect.objectContaining({
        rowsDetected: 1,
        created: 0,
        skippedDuplicates: 1,
        failedValidation: 0
      })
    );
    expect(pool.insertedResidents).toEqual([]);
  });

  it("rejects CSV uploads for commit", async () => {
    const pool = createCommitPool();
    const app = createApp(pool);
    const cookie = await loginAs(app, "admin", "admin123");

    const response = await request(app)
      .post("/api/admin/excel-import/commit")
      .set("Cookie", cookie)
      .set("Origin", TRUSTED_ORIGIN)
      .set("Content-Type", "text/csv")
      .set("X-File-Name", "phase1-fake.csv")
      .set("X-Import-Confirmed", "true")
      .set("X-Backup-Confirmed", "true")
      .send("fullName,address\nSynthetic Person,Synthetic Address");

    expect(response.status).toBe(415);
    expect(response.body.error).toContain(".xlsx");
    expect(pool.queries.some((query) => query.sql.includes("FROM residents"))).toBe(false);
    expect(pool.insertedResidents).toEqual([]);
    expect(pool.audits).toEqual([]);
  });
});
