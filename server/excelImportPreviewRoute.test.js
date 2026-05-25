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
