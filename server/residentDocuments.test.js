import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import request from "supertest";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createApp } from "./app.js";

const TRUSTED_ORIGIN = "https://barangay-staff.example.test";

const profiles = {
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

const resident = {
  id: "RBI-2026-0001",
  archived_at: null
};
const pdfBuffer = Buffer.from("%PDF-1.7\n");
const pngBuffer = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00]);
const jpegBuffer = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00]);

function findProfile(value) {
  return Object.values(profiles).find((profile) => profile.id === value || profile.username === value);
}

function createResidentDocumentPool() {
  const documents = new Map([
    [
      "RDOC-GEN-1",
      {
        id: "RDOC-GEN-1",
        resident_id: resident.id,
        uploaded_by_profile_id: "dept-1",
        uploaded_by_name: "Elena Ledesma",
        document_type: "birth_certificate",
        original_filename: "birth-certificate.pdf",
        stored_filename: "stored-general.pdf",
        mime_type: "application/pdf",
        file_size_bytes: 7,
        storage_path: join("resident-documents", resident.id, "stored-general.pdf"),
        visibility_scope: "department_visible",
        linked_case_id: null,
        created_at: "2026-05-26T00:00:00.000Z",
        archived_at: null
      }
    ],
    [
      "RDOC-CASE-GENERAL-1",
      {
        id: "RDOC-CASE-GENERAL-1",
        resident_id: resident.id,
        uploaded_by_profile_id: "lupon-1",
        uploaded_by_name: "Juan Santos",
        document_type: "case_attachment",
        original_filename: "case-general.pdf",
        stored_filename: "stored-case-general.pdf",
        mime_type: "application/pdf",
        file_size_bytes: 9,
        storage_path: join("resident-documents", resident.id, "stored-case-general.pdf"),
        visibility_scope: "general_internal",
        linked_case_id: "LC-2026-0001",
        created_at: "2026-05-26T00:04:00.000Z",
        archived_at: null
      }
    ],
    [
      "RDOC-ADMIN-1",
      {
        id: "RDOC-ADMIN-1",
        resident_id: resident.id,
        uploaded_by_profile_id: "admin-1",
        uploaded_by_name: "Ricardo Morales",
        document_type: "admin_hold",
        original_filename: "admin-only.pdf",
        stored_filename: "stored-admin.pdf",
        mime_type: "application/pdf",
        file_size_bytes: 9,
        storage_path: join("resident-documents", resident.id, "stored-admin.pdf"),
        visibility_scope: "admin_only",
        linked_case_id: null,
        created_at: "2026-05-26T00:03:00.000Z",
        archived_at: null
      }
    ],
    [
      "RDOC-LUPON-1",
      {
        id: "RDOC-LUPON-1",
        resident_id: resident.id,
        uploaded_by_profile_id: "lupon-1",
        uploaded_by_name: "Juan Santos",
        document_type: "mediation_evidence",
        original_filename: "case-evidence.png",
        stored_filename: "stored-confidential.png",
        mime_type: "image/png",
        file_size_bytes: 9,
        storage_path: join("resident-documents", resident.id, "stored-confidential.png"),
        visibility_scope: "lupon_confidential",
        linked_case_id: "LC-2026-0001",
        created_at: "2026-05-26T00:05:00.000Z",
        archived_at: null
      }
    ],
    [
      "RDOC-ARCHIVED-1",
      {
        id: "RDOC-ARCHIVED-1",
        resident_id: resident.id,
        uploaded_by_profile_id: "dept-1",
        uploaded_by_name: "Elena Ledesma",
        document_type: "old_id",
        original_filename: "old-id.jpg",
        stored_filename: "stored-archived.jpg",
        mime_type: "image/jpeg",
        file_size_bytes: 5,
        storage_path: join("resident-documents", resident.id, "stored-archived.jpg"),
        visibility_scope: "general_internal",
        linked_case_id: null,
        created_at: "2026-05-25T00:00:00.000Z",
        archived_at: "2026-05-26T01:00:00.000Z"
      }
    ]
  ]);
  const queries = [];

  return {
    documents,
    queries,
    async query(sql, params = []) {
      queries.push({ sql, params });

      if (sql.includes("INSERT INTO audit_logs")) {
        return { rows: [], rowCount: 1 };
      }

      if (sql.includes("FROM profiles")) {
        const profile = findProfile(params[0]);
        return { rows: profile ? [profile] : [], rowCount: profile ? 1 : 0 };
      }

      if (sql.includes("FROM residents")) {
        return params[0] === resident.id ? { rows: [resident], rowCount: 1 } : { rows: [], rowCount: 0 };
      }

      if (sql.includes("INSERT INTO resident_documents")) {
        const row = {
          id: params[0],
          resident_id: params[1],
          uploaded_by_profile_id: params[2],
          uploaded_by_name: findProfile(params[2])?.display_name,
          document_type: params[3],
          original_filename: params[4],
          stored_filename: params[5],
          mime_type: params[6],
          file_size_bytes: params[7],
          storage_path: params[8],
          visibility_scope: params[9],
          linked_case_id: params[10],
          created_at: "2026-05-26T02:00:00.000Z",
          archived_at: null
        };

        documents.set(row.id, row);
        return { rows: [row], rowCount: 1 };
      }

      if (sql.includes("UPDATE resident_documents") && sql.includes("archived_at = now()")) {
        const row = documents.get(params[0]);
        if (!row) {
          return { rows: [], rowCount: 0 };
        }

        row.archived_at = "2026-05-26T03:00:00.000Z";
        return { rows: [row], rowCount: 1 };
      }

      if (
        sql.includes("FROM resident_documents") &&
        (sql.includes("WHERE id = $1") || sql.includes("WHERE documents.id = $1"))
      ) {
        const row = documents.get(params[0]);
        return row ? { rows: [row], rowCount: 1 } : { rows: [], rowCount: 0 };
      }

      if (sql.includes("FROM resident_documents")) {
        const rows = [...documents.values()]
          .filter((document) => document.resident_id === params[0] && !document.archived_at)
          .sort((left, right) => String(right.created_at).localeCompare(String(left.created_at)));

        return { rows, rowCount: rows.length };
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

describe("resident documents", () => {
  let uploadRoot;

  beforeEach(async () => {
    uploadRoot = await mkdtemp(join(tmpdir(), "resident-documents-test-"));
    await mkdir(join(uploadRoot, "resident-documents", resident.id), { recursive: true });
    await writeFile(
      join(uploadRoot, "resident-documents", resident.id, "stored-general.pdf"),
      pdfBuffer
    );
    await writeFile(
      join(uploadRoot, "resident-documents", resident.id, "stored-case-general.pdf"),
      pdfBuffer
    );
    await writeFile(
      join(uploadRoot, "resident-documents", resident.id, "stored-admin.pdf"),
      pdfBuffer
    );
    await writeFile(
      join(uploadRoot, "resident-documents", resident.id, "stored-confidential.png"),
      pngBuffer
    );
    await writeFile(
      join(uploadRoot, "resident-documents", resident.id, "stored-archived.jpg"),
      jpegBuffer
    );
    vi.stubEnv("AUTH_SESSION_SECRET", "test-auth-session-secret");
    vi.stubEnv("CORS_ORIGINS", TRUSTED_ORIGIN);
    vi.stubEnv("RESIDENT_DOCUMENT_UPLOAD_ROOT", uploadRoot);
    vi.stubEnv("RESIDENT_DOCUMENT_MAX_BYTES", "16");
  });

  afterEach(async () => {
    vi.unstubAllEnvs();
    await rm(uploadRoot, { force: true, recursive: true });
  });

  it("allows Lupon to upload, list, and view confidential resident documents", async () => {
    const pool = createResidentDocumentPool();
    const app = createApp(pool);
    const cookie = await loginAs(app, "lupon", "lupon123");

    const uploadResponse = await request(app)
      .post(`/api/residents/${resident.id}/documents`)
      .set("Cookie", cookie)
      .set("Origin", TRUSTED_ORIGIN)
      .set("Content-Type", "image/png")
      .set("X-File-Name", "Case Evidence ../scan.png")
      .set("X-Document-Type", "mediation_evidence")
      .set("X-Visibility-Scope", "lupon_confidential")
      .set("X-Linked-Case-Id", "LC-2026-0002")
      .send(pngBuffer);

    expect(uploadResponse.status, JSON.stringify(uploadResponse.body)).toBe(201);
    expect(uploadResponse.body.document).toMatchObject({
      residentId: resident.id,
      documentType: "mediation_evidence",
      originalFilename: "Case Evidence scan.png",
      mimeType: "image/png",
      visibilityScope: "lupon_confidential",
      linkedCaseId: "LC-2026-0002"
    });
    expect(uploadResponse.body.document).not.toHaveProperty("storagePath");

    const listResponse = await request(app)
      .get(`/api/residents/${resident.id}/documents`)
      .set("Cookie", cookie);

    expect(listResponse.status).toBe(200);
    expect(listResponse.body.documents.map((document) => document.id)).toContain("RDOC-LUPON-1");
    expect(listResponse.body.documents.map((document) => document.id)).not.toContain("RDOC-ARCHIVED-1");

    const viewResponse = await request(app)
      .get("/api/resident-documents/RDOC-LUPON-1")
      .set("Cookie", cookie);

    expect(viewResponse.status).toBe(200);
    expect(viewResponse.headers["content-type"]).toContain("image/png");
  });

  it("lets Department list and view only non-case general documents without inferring confidential documents", async () => {
    const pool = createResidentDocumentPool();
    const app = createApp(pool);
    const cookie = await loginAs(app, "department", "dept123");

    const listResponse = await request(app)
      .get(`/api/residents/${resident.id}/documents`)
      .set("Cookie", cookie);

    expect(listResponse.status).toBe(200);
    expect(listResponse.body.documents).toEqual([
      expect.objectContaining({
        id: "RDOC-GEN-1",
        visibilityScope: "department_visible",
        linkedCaseId: null
      })
    ]);
    expect(JSON.stringify(listResponse.body)).not.toContain("RDOC-LUPON-1");
    expect(JSON.stringify(listResponse.body)).not.toContain("RDOC-CASE-GENERAL-1");
    expect(JSON.stringify(listResponse.body)).not.toContain("RDOC-ADMIN-1");
    expect(JSON.stringify(listResponse.body)).not.toContain("lupon_confidential");
    expect(JSON.stringify(listResponse.body)).not.toContain("admin_only");

    const allowedViewResponse = await request(app)
      .get("/api/resident-documents/RDOC-GEN-1")
      .set("Cookie", cookie);

    expect(allowedViewResponse.status).toBe(200);

    const blockedViewResponse = await request(app)
      .get("/api/resident-documents/RDOC-LUPON-1")
      .set("Cookie", cookie);

    expect(blockedViewResponse.status).toBe(404);
    expect(JSON.stringify(blockedViewResponse.body)).not.toContain("lupon_confidential");

    const linkedCaseViewResponse = await request(app)
      .get("/api/resident-documents/RDOC-CASE-GENERAL-1")
      .set("Cookie", cookie);

    expect(linkedCaseViewResponse.status).toBe(404);

    const adminOnlyViewResponse = await request(app)
      .get("/api/resident-documents/RDOC-ADMIN-1")
      .set("Cookie", cookie);

    expect(adminOnlyViewResponse.status).toBe(404);

    const archivedViewResponse = await request(app)
      .get("/api/resident-documents/RDOC-ARCHIVED-1")
      .set("Cookie", cookie);

    expect(archivedViewResponse.status).toBe(404);
  });

  it("returns Admin metadata without exposing confidential file content", async () => {
    const pool = createResidentDocumentPool();
    const app = createApp(pool);
    const cookie = await loginAs(app, "admin", "admin123");

    const listResponse = await request(app)
      .get(`/api/residents/${resident.id}/documents`)
      .set("Cookie", cookie);

    expect(listResponse.status).toBe(200);
    expect(listResponse.body.documents).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: "RDOC-LUPON-1",
          visibilityScope: "lupon_confidential"
        })
      ])
    );
    expect(JSON.stringify(listResponse.body)).not.toContain("storage_path");
    expect(JSON.stringify(listResponse.body)).not.toContain("stored-confidential.png");

    const viewResponse = await request(app)
      .get("/api/resident-documents/RDOC-LUPON-1")
      .set("Cookie", cookie);

    expect(viewResponse.status).toBe(403);
  });

  it("requires authentication before serving document content", async () => {
    const pool = createResidentDocumentPool();
    const app = createApp(pool);

    const response = await request(app).get("/api/resident-documents/RDOC-GEN-1");

    expect(response.status).toBe(401);
  });

  it("rejects invalid and oversized uploads before writing document metadata", async () => {
    const pool = createResidentDocumentPool();
    const app = createApp(pool);
    const cookie = await loginAs(app, "department", "dept123");

    const invalidResponse = await request(app)
      .post(`/api/residents/${resident.id}/documents`)
      .set("Cookie", cookie)
      .set("Origin", TRUSTED_ORIGIN)
      .set("Content-Type", "text/plain")
      .set("X-File-Name", "notes.txt")
      .set("X-Document-Type", "notes")
      .set("X-Visibility-Scope", "department_visible")
      .send(Buffer.from("not allowed"));

    expect(invalidResponse.status).toBe(415);

    const oversizedResponse = await request(app)
      .post(`/api/residents/${resident.id}/documents`)
      .set("Cookie", cookie)
      .set("Origin", TRUSTED_ORIGIN)
      .set("Content-Type", "application/pdf")
      .set("X-File-Name", "large.pdf")
      .set("X-Document-Type", "large")
      .set("X-Visibility-Scope", "department_visible")
      .send(Buffer.from("this file is too large"));

    expect(oversizedResponse.status).toBe(413);
    expect(pool.queries.some((query) => query.sql.includes("INSERT INTO resident_documents"))).toBe(false);
  });

  it("rejects uploads with spoofed MIME types or extensions", async () => {
    const pool = createResidentDocumentPool();
    const app = createApp(pool);
    const cookie = await loginAs(app, "department", "dept123");

    const response = await request(app)
      .post(`/api/residents/${resident.id}/documents`)
      .set("Cookie", cookie)
      .set("Origin", TRUSTED_ORIGIN)
      .set("Content-Type", "application/pdf")
      .set("X-File-Name", "not-really.pdf")
      .set("X-Document-Type", "evidence")
      .set("X-Visibility-Scope", "department_visible")
      .send(Buffer.from("not a pdf"));

    expect(response.status).toBe(415);
    expect(pool.queries.some((query) => query.sql.includes("INSERT INTO resident_documents"))).toBe(false);
  });
});
