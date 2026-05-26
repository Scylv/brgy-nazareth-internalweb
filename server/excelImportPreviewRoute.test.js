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

function createCommitWorkbook(rows) {
  return createXlsxWorkbook({
    sheets: [
      {
        name: MAIN_RESIDENT_SHEET_NAME,
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
  const importBatches = [];
  const residentRows = [
    {
      id: "RBI-FAKE-0002",
      full_name: "Existing Synthetic Resident",
      birth_date: "1980-01-01",
      address: "Existing Address",
      contact_number: "09170000008"
    }
  ];

  return {
    audits,
    importBatches,
    insertedResidents,
    queries,
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
          totalRows: params[3],
          createdByProfileId: params[4]
        });

        return { rows: [], rowCount: 1 };
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
          contactNumber: params[8],
          email: params[9],
          additionalInformation: params[10],
          sectors: params[11],
          registeredVoter: params[12],
          precinctNumber: params[13],
          statusColor: params[14]
        };

        insertedResidents.push(resident);
        residentRows.push({
          id: resident.id,
          full_name: resident.fullName,
          birth_date: resident.birthDate,
          address: resident.address,
          contact_number: resident.contactNumber
        });

        return { rows: [resident], rowCount: 1 };
      }

      if (sql.includes("INSERT INTO resident_status_history")) {
        return { rows: [], rowCount: 1 };
      }

      return { rows: [], rowCount: 0 };
    }
  };
}

async function loginAs(app, username, password) {
  const response = await request(app).post("/api/auth/login").send({ username, password });

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
    expect(pool.insertedResidents[0].additionalInformation).toBeNull();
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

  it("does not skip rows only because full name and exact address match", async () => {
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
        created: 1,
        skippedDuplicates: 0,
        failedValidation: 0
      })
    );
    expect(pool.insertedResidents).toEqual([
      expect.objectContaining({
        fullName: "Existing Synthetic Resident",
        birthDate: null,
        address: "Existing Address"
      })
    ]);
  });

  it("does not skip rows only because full name and contact number match", async () => {
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
        created: 1,
        skippedDuplicates: 0,
        failedValidation: 0
      })
    );
    expect(pool.insertedResidents).toEqual([
      expect.objectContaining({
        fullName: "Existing Synthetic Resident",
        birthDate: null,
        contactNumber: "09170000008"
      })
    ]);
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
