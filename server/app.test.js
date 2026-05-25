import request from "supertest";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createApp } from "./app.js";

function createPool(rowsByQuery = []) {
  const queries = [];

  return {
    queries,
    async query(sql, params = []) {
      queries.push({ sql, params });
      const rows = rowsByQuery[queries.length - 1] ?? [];
      return {
        rows,
        rowCount: rows.length
      };
    }
  };
}

function createResidentUpdatePool(initialResident = residentRow) {
  const queries = [];
  let resident = { ...initialResident };

  return {
    queries,
    async query(sql, params = []) {
      queries.push({ sql, params });

      if (sql.includes("FROM profiles")) {
        const profile = Object.values(profileRows).find(
          (row) => row.id === params[0] || row.username === params[0]
        );
        return {
          rows: profile ? [profile] : [],
          rowCount: profile ? 1 : 0
        };
      }

      if (sql.includes("UPDATE residents")) {
        resident = {
          ...resident,
          household_id: params[0],
          full_name: params[1],
          birth_date: params[2],
          gender: params[3],
          civil_status: params[4],
          occupation: params[5],
          address: params[6],
          contact_number: params[7],
          email: params[8],
          additional_information: params[9],
          sectors: params[10],
          registered_voter: params[11],
          precinct_number: params[12],
          status_color: params[13],
          updated_at: "2026-05-24T00:00:00.000Z"
        };

        return {
          rows: [resident],
          rowCount: 1
        };
      }

      if (sql.includes("FROM residents")) {
        return {
          rows: [resident],
          rowCount: 1
        };
      }

      return {
        rows: [],
        rowCount: 0
      };
    }
  };
}

const residentRow = {
  id: "RBI-2024-0002",
  household_id: "HH-NAZ-1034",
  full_name: "Maria Santos",
  birth_date: "1992-07-20",
  gender: "Female",
  civil_status: "Single",
  occupation: "Vendor",
  address: "Purok 2, Lower Nazareth",
  contact_number: "09181112222",
  email: "maria.santos@example.com",
  additional_information: "Needs address re-verification.",
  sectors: ["Solo Parent", "Registered Voter"],
  registered_voter: true,
  precinct_number: "0187B",
  status_color: "yellow",
  created_at: "2026-05-01T00:00:00.000Z",
  updated_at: "2026-05-01T00:00:00.000Z"
};

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

async function loginAs(app, username, password) {
  const response = await request(app).post("/api/auth/login").send({ username, password });

  expect(response.status, JSON.stringify(response.body)).toBe(200);
  expect(response.headers["set-cookie"]?.[0]).toContain("barangay_session=");

  return response.headers["set-cookie"];
}

beforeEach(() => {
  vi.stubEnv("AUTH_SESSION_SECRET", "test-auth-session-secret");
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("authentication and role-based API access", () => {
  it("fails startup without AUTH_SESSION_SECRET outside local development", () => {
    vi.stubEnv("NODE_ENV", "staging");
    vi.stubEnv("AUTH_SESSION_SECRET", "");

    expect(() => createApp(createPool())).toThrow("AUTH_SESSION_SECRET is required");
  });

  it("logs in with a database user and sets an HTTP-only session cookie", async () => {
    const app = createApp(createPool([[profileRows.department]]));

    const response = await request(app).post("/api/auth/login").send({
      username: "department",
      password: "dept123"
    });

    expect(response.status).toBe(200);
    expect(response.body.user).toEqual({
      id: "dept-1",
      username: "department",
      name: "Elena Ledesma",
      role: "department"
    });
    expect(response.body.user).not.toHaveProperty("passwordHash");
    expect(response.headers["set-cookie"]?.[0]).toContain("barangay_session=");
    expect(response.headers["set-cookie"]?.[0]).toContain("HttpOnly");
  });

  it("uses local development session cookie attributes", async () => {
    vi.stubEnv("NODE_ENV", "development");
    const app = createApp(createPool([[profileRows.department]]));

    const response = await request(app).post("/api/auth/login").send({
      username: "department",
      password: "dept123"
    });

    const cookie = response.headers["set-cookie"]?.[0] ?? "";

    expect(response.status).toBe(200);
    expect(cookie).toContain("HttpOnly");
    expect(cookie).toContain("SameSite=Lax");
    expect(cookie).not.toContain("Secure");
  });

  it("uses hosted-safe staging session cookie attributes", async () => {
    vi.stubEnv("NODE_ENV", "staging");
    const app = createApp(createPool([[profileRows.department]]));

    const response = await request(app).post("/api/auth/login").send({
      username: "department",
      password: "dept123"
    });

    const cookie = response.headers["set-cookie"]?.[0] ?? "";

    expect(response.status).toBe(200);
    expect(cookie).toContain("HttpOnly");
    expect(cookie).toContain("SameSite=None");
    expect(cookie).toContain("Secure");
  });

  it("rejects insecure SameSite=None cookie configuration at startup", () => {
    vi.stubEnv("NODE_ENV", "staging");
    vi.stubEnv("AUTH_COOKIE_SAMESITE", "None");
    vi.stubEnv("AUTH_COOKIE_SECURE", "false");

    expect(() => createApp(createPool())).toThrow(
      "AUTH_COOKIE_SECURE must be true when AUTH_COOKIE_SAMESITE is None"
    );
  });

  it("rejects an invalid password for a database user", async () => {
    const app = createApp(createPool([[profileRows.department]]));

    const response = await request(app).post("/api/auth/login").send({
      username: "department",
      password: "wrong-password"
    });

    expect(response.status).toBe(401);
    expect(response.body.error).toContain("Invalid username or password");
    expect(response.headers["set-cookie"]).toBeUndefined();
  });

  it("rejects empty login input before querying the database", async () => {
    const pool = createPool();
    const app = createApp(pool);

    const response = await request(app).post("/api/auth/login").send({
      username: "",
      password: ""
    });

    expect(response.status).toBe(400);
    expect(response.body.error).toContain("Username and password are required");
    expect(pool.queries).toHaveLength(0);
  });

  it("returns the current authenticated user", async () => {
    const app = createApp(createPool([[profileRows.department], [profileRows.department]]));
    const cookie = await loginAs(app, "department", "dept123");

    const response = await request(app).get("/api/auth/me").set("Cookie", cookie);

    expect(response.status).toBe(200);
    expect(response.body.user).toEqual({
      id: "dept-1",
      username: "department",
      name: "Elena Ledesma",
      role: "department"
    });
  });

  it("clears the session cookie on logout", async () => {
    const app = createApp(createPool());

    const response = await request(app).post("/api/auth/logout");

    expect(response.status).toBe(200);
    expect(response.headers["set-cookie"]?.[0]).toContain("barangay_session=;");
    expect(response.headers["set-cookie"]?.[0]).toContain("Max-Age=0");
  });

  it("requires authentication before protected resident routes", async () => {
    const app = createApp(createPool());

    const response = await request(app).get("/api/residents");

    expect(response.status).toBe(401);
    expect(response.body.error).toContain("Authentication is required");
  });

  it("allows Vite frontend preflight requests with cookie credentials", async () => {
    vi.stubEnv("NODE_ENV", "development");
    const app = createApp(createPool());

    const response = await request(app)
      .options("/api/residents")
      .set("Origin", "http://localhost:5173")
      .set("Access-Control-Request-Headers", "Content-Type");

    expect(response.status).toBe(204);
    expect(response.headers["access-control-allow-origin"]).toBe("http://localhost:5173");
    expect(response.headers["access-control-allow-credentials"]).toBe("true");
    expect(response.headers["access-control-allow-headers"]).toContain("Content-Type");
  });

  it("allows configured staging frontend origins from CORS_ORIGINS", async () => {
    vi.stubEnv("NODE_ENV", "staging");
    vi.stubEnv(
      "CORS_ORIGINS",
      "https://example-staging-frontend.onrender.com, https://preview.example.com"
    );
    const app = createApp(createPool());

    const response = await request(app)
      .options("/api/residents")
      .set("Origin", "https://example-staging-frontend.onrender.com")
      .set("Access-Control-Request-Headers", "Content-Type");

    expect(response.status).toBe(204);
    expect(response.headers["access-control-allow-origin"]).toBe(
      "https://example-staging-frontend.onrender.com"
    );
    expect(response.headers["access-control-allow-credentials"]).toBe("true");
    expect(response.headers.vary).toBe("Origin");
  });

  it("blocks Department users from Lupon case routes", async () => {
    const pool = createPool([[profileRows.department], [profileRows.department]]);
    const app = createApp(pool);
    const cookie = await loginAs(app, "department", "dept123");

    const response = await request(app).get("/api/lupon/cases").set("Cookie", cookie);

    expect(response.status).toBe(403);
    expect(JSON.stringify(response.body)).not.toContain("luponCases");
    expect(JSON.stringify(response.body)).not.toContain("luponCaseNotes");
    expect(JSON.stringify(response.body)).not.toContain("confidentialSummary");
    expect(JSON.stringify(response.body)).not.toContain("noteBody");
    expect(pool.queries).toHaveLength(2);
    expect(pool.queries.at(-1).sql).not.toContain("FROM lupon_cases");
  });

  it("blocks Admin users from Lupon case routes", async () => {
    const pool = createPool([[profileRows.admin], [profileRows.admin]]);
    const app = createApp(pool);
    const cookie = await loginAs(app, "admin", "admin123");

    const response = await request(app).get("/api/lupon/cases").set("Cookie", cookie);

    expect(response.status).toBe(403);
    expect(JSON.stringify(response.body)).not.toContain("luponCases");
    expect(JSON.stringify(response.body)).not.toContain("confidentialSummary");
    expect(pool.queries).toHaveLength(2);
    expect(pool.queries.at(-1).sql).not.toContain("FROM lupon_cases");
  });

  it("allows Admin users to list database profiles with safe fields only", async () => {
    const pool = createPool([
      [profileRows.admin],
      [profileRows.admin],
      [
        {
          ...profileRows.admin,
          created_at: "2026-05-01T00:00:00.000Z",
          updated_at: "2026-05-02T00:00:00.000Z"
        },
        {
          ...profileRows.department,
          created_at: "2026-05-03T00:00:00.000Z",
          updated_at: "2026-05-04T00:00:00.000Z"
        }
      ]
    ]);
    const app = createApp(pool);
    const cookie = await loginAs(app, "admin", "admin123");

    const response = await request(app).get("/api/admin/profiles").set("Cookie", cookie);

    expect(response.status).toBe(200);
    expect(response.body.profiles).toEqual([
      {
        id: "admin-1",
        username: "admin",
        displayName: "Ricardo Morales",
        role: "admin",
        createdAt: "2026-05-01T00:00:00.000Z",
        updatedAt: "2026-05-02T00:00:00.000Z"
      },
      {
        id: "dept-1",
        username: "department",
        displayName: "Elena Ledesma",
        role: "department",
        createdAt: "2026-05-03T00:00:00.000Z",
        updatedAt: "2026-05-04T00:00:00.000Z"
      }
    ]);
    expect(JSON.stringify(response.body)).not.toContain("password_hash");
    expect(JSON.stringify(response.body)).not.toContain("scrypt$");
    expect(pool.queries.at(-1).sql).not.toContain("password_hash");
  });

  it("blocks Department users from Admin profile routes", async () => {
    const pool = createPool([[profileRows.department], [profileRows.department]]);
    const app = createApp(pool);
    const cookie = await loginAs(app, "department", "dept123");

    const response = await request(app).get("/api/admin/profiles").set("Cookie", cookie);

    expect(response.status).toBe(403);
    expect(response.body.error).toContain("not allowed");
    expect(pool.queries).toHaveLength(2);
    expect(pool.queries.at(-1).sql).not.toContain("ORDER BY created_at");
  });

  it("blocks Lupon users from Admin profile routes", async () => {
    const pool = createPool([[profileRows.lupon], [profileRows.lupon]]);
    const app = createApp(pool);
    const cookie = await loginAs(app, "lupon", "lupon123");

    const response = await request(app).get("/api/admin/profiles").set("Cookie", cookie);

    expect(response.status).toBe(403);
    expect(response.body.error).toContain("not allowed");
    expect(pool.queries).toHaveLength(2);
    expect(pool.queries.at(-1).sql).not.toContain("ORDER BY created_at");
  });

  it("rejects unauthenticated Admin profile route requests", async () => {
    const pool = createPool();
    const app = createApp(pool);

    const response = await request(app).get("/api/admin/profiles");

    expect(response.status).toBe(401);
    expect(response.body.error).toContain("Authentication is required");
    expect(pool.queries).toHaveLength(0);
  });

  it("allows Lupon users to access Lupon case routes", async () => {
    const pool = createPool([
      [profileRows.lupon],
      [profileRows.lupon],
      [
        {
          id: "LC-2026-0001",
          resident_id: "RBI-2024-0002",
          case_number: "LPN-2026-0001",
          case_type: "Address Verification",
          status: "under_mediation",
          priority: "normal",
          confidential_summary: "Address mismatch reported during verification.",
          opened_at: "2026-05-01",
          resolved_at: null,
          assigned_lupon_profile_id: "lupon-1",
          created_by_profile_id: "lupon-1",
          created_at: "2026-05-01T00:00:00.000Z",
          updated_at: "2026-05-01T00:00:00.000Z"
        }
      ]
    ]);
    const app = createApp(pool);
    const cookie = await loginAs(app, "lupon", "lupon123");

    const response = await request(app).get("/api/lupon/cases").set("Cookie", cookie);

    expect(response.status).toBe(200);
    expect(response.body.luponCases[0].confidentialSummary).toContain("Address mismatch");
    expect(JSON.stringify(response.body)).not.toContain("noteBody");
  });

  it("does not return Lupon confidential fields to Department resident routes", async () => {
    const pool = createPool([[profileRows.department], [profileRows.department], [residentRow]]);
    const app = createApp(pool);
    const cookie = await loginAs(app, "department", "dept123");

    const response = await request(app)
      .get("/api/residents/RBI-2024-0002")
      .set("Cookie", cookie);

    expect(response.status).toBe(200);
    expect(response.body.resident).toMatchObject({ id: "RBI-2024-0002", statusColor: "yellow" });
    expect(response.body.resident).not.toHaveProperty("remarks");
    expect(response.body.resident).not.toHaveProperty("caseReason");
    expect(response.body).not.toHaveProperty("luponCases");
    expect(response.body).not.toHaveProperty("luponCaseNotes");
    expect(JSON.stringify(response.body)).not.toContain("confidentialSummary");
    expect(JSON.stringify(response.body)).not.toContain("noteBody");
    expect(JSON.stringify(response.body)).not.toContain("remarks");
    expect(JSON.stringify(response.body)).not.toContain("caseReason");
    expect(pool.queries).toHaveLength(3);
  });

  it("allows Lupon users to read confidential case context", async () => {
    const pool = createPool([
      [profileRows.lupon],
      [profileRows.lupon],
      [residentRow],
      [
        {
          id: "LC-2026-0001",
          resident_id: "RBI-2024-0002",
          case_number: "LPN-2026-0001",
          case_type: "Address Verification",
          status: "under_mediation",
          priority: "normal",
          confidential_summary: "Address mismatch reported during verification.",
          opened_at: "2026-05-01",
          resolved_at: null,
          assigned_lupon_profile_id: "lupon-1",
          created_by_profile_id: "lupon-1",
          created_at: "2026-05-01T00:00:00.000Z",
          updated_at: "2026-05-01T00:00:00.000Z"
        }
      ],
      [
        {
          id: "LCN-2026-0001",
          lupon_case_id: "LC-2026-0001",
          note_type: "internal",
          note_body: "Pending review by Lupon clerk.",
          created_by_profile_id: "lupon-1",
          created_at: "2026-05-01T01:00:00.000Z"
        }
      ]
    ]);
    const app = createApp(pool);
    const cookie = await loginAs(app, "lupon", "lupon123");

    const response = await request(app)
      .get("/api/residents/RBI-2024-0002")
      .set("Cookie", cookie);

    expect(response.status).toBe(200);
    expect(response.body.luponCases[0].confidentialSummary).toContain("Address mismatch");
    expect(response.body.luponCaseNotes[0].noteBody).toContain("Pending review");
  });

  it("rejects invalid document request statuses before writing to the database", async () => {
    const pool = createPool([[profileRows.department], [profileRows.department]]);
    const app = createApp(pool);
    const cookie = await loginAs(app, "department", "dept123");

    const response = await request(app)
      .post("/api/document-requests")
      .set("Cookie", cookie)
      .send({
        residentId: "RBI-2024-0001",
        barangayDocumentId: "BDOC-001",
        purpose: "Local employment requirement",
        requestDate: "2026-05-18",
        status: "on_hold"
      });

    expect(response.status).toBe(400);
    expect(response.body.error).toContain("Invalid document request status");
    expect(pool.queries).toHaveLength(2);
  });

  it("maps document request rows for Department users without Lupon confidential fields", async () => {
    const pool = createPool([
      [profileRows.department],
      [profileRows.department],
      [
        {
          id: "DOC-2026-0007",
          resident_id: "RBI-2024-0001",
          barangay_document_id: "BDOC-001",
          barangay_document_name: "Barangay Clearance",
          purpose: "Local employment requirement",
          status: "processing",
          request_date: "2026-05-18",
          release_date: null,
          expiry_date: "2026-11-18",
          processed_by_profile_id: "dept-1",
          processed_by_name: "Elena Ledesma",
          created_at: "2026-05-18T00:00:00.000Z",
          updated_at: "2026-05-18T00:00:00.000Z"
        }
      ]
    ]);
    const app = createApp(pool);
    const cookie = await loginAs(app, "department", "dept123");

    const response = await request(app).get("/api/document-requests").set("Cookie", cookie);

    expect(response.status).toBe(200);
    expect(response.body.documentRequests).toEqual([
      {
        id: "DOC-2026-0007",
        residentId: "RBI-2024-0001",
        barangayDocumentId: "BDOC-001",
        barangayDocumentName: "Barangay Clearance",
        purpose: "Local employment requirement",
        status: "processing",
        requestDate: "2026-05-18",
        releaseDate: null,
        expiryDate: "2026-11-18",
        processedByProfileId: "dept-1",
        processedByName: "Elena Ledesma",
        createdAt: "2026-05-18T00:00:00.000Z",
        updatedAt: "2026-05-18T00:00:00.000Z"
      }
    ]);
    expect(JSON.stringify(response.body)).not.toContain("confidentialSummary");
    expect(JSON.stringify(response.body)).not.toContain("noteBody");
  });

  it("creates document requests with a lowercase default status and the session profile", async () => {
    const pool = createPool([
      [profileRows.department],
      [profileRows.department],
      [
        {
          id: "DOC-2026-0008",
          resident_id: "RBI-2024-0001",
          barangay_document_id: "BDOC-001",
          barangay_document_name: "Barangay Clearance",
          purpose: "Local employment requirement",
          status: "pending",
          request_date: "2026-05-19",
          release_date: null,
          expiry_date: null,
          processed_by_profile_id: "dept-1",
          processed_by_name: "Elena Ledesma",
          created_at: "2026-05-19T00:00:00.000Z",
          updated_at: "2026-05-19T00:00:00.000Z"
        }
      ]
    ]);
    const app = createApp(pool);
    const cookie = await loginAs(app, "department", "dept123");

    const response = await request(app)
      .post("/api/document-requests")
      .set("Cookie", cookie)
      .set("x-user-role", "lupon")
      .set("x-profile-id", "fake-profile")
      .send({
        residentId: "RBI-2024-0001",
        barangayDocumentId: "BDOC-001",
        purpose: "Local employment requirement",
        requestDate: "2026-05-19"
      });

    expect(response.status).toBe(201);
    expect(response.body.documentRequest).toMatchObject({
      id: "DOC-2026-0008",
      residentId: "RBI-2024-0001",
      barangayDocumentId: "BDOC-001",
      barangayDocumentName: "Barangay Clearance",
      status: "pending",
      processedByProfileId: "dept-1",
      processedByName: "Elena Ledesma"
    });
    expect(pool.queries.at(-1).sql).toContain("documents.name AS barangay_document_name");
    expect(pool.queries.at(-1).sql).toContain("profiles.display_name AS processed_by_name");
    expect(pool.queries.at(-1).params.slice(1)).toEqual([
      "RBI-2024-0001",
      "BDOC-001",
      "Local employment requirement",
      "pending",
      "2026-05-19",
      null,
      null,
      "dept-1"
    ]);
  });

  it("rejects missing document request fields before writing to the database", async () => {
    const pool = createPool([[profileRows.department], [profileRows.department]]);
    const app = createApp(pool);
    const cookie = await loginAs(app, "department", "dept123");

    const response = await request(app)
      .post("/api/document-requests")
      .set("Cookie", cookie)
      .send({
        residentId: "RBI-2024-0001",
        purpose: "Local employment requirement"
      });

    expect(response.status).toBe(400);
    expect(response.body.fields).toEqual(["barangayDocumentId", "requestDate"]);
    expect(pool.queries).toHaveLength(2);
  });

  it("blocks Lupon users from creating Department document requests", async () => {
    const pool = createPool([[profileRows.lupon], [profileRows.lupon]]);
    const app = createApp(pool);
    const cookie = await loginAs(app, "lupon", "lupon123");

    const response = await request(app)
      .post("/api/document-requests")
      .set("Cookie", cookie)
      .send({
        residentId: "RBI-2024-0001",
        barangayDocumentId: "BDOC-001",
        purpose: "Local employment requirement",
        requestDate: "2026-05-19"
      });

    expect(response.status).toBe(403);
    expect(pool.queries).toHaveLength(2);
  });

  it("allows Lupon users to update resident status and non-confidential fields", async () => {
    const pool = createPool([[profileRows.lupon], [profileRows.lupon], [residentRow], [{ ...residentRow, full_name: "Maria S. Santos", status_color: "green" }]]);
    const app = createApp(pool);
    const cookie = await loginAs(app, "lupon", "lupon123");

    const response = await request(app)
      .patch("/api/residents/RBI-2024-0002")
      .set("Cookie", cookie)
      .send({
        fullName: "Maria S. Santos",
        status: "green",
        remarks: "Do not write this to residents.",
        caseReason: "Confidential Lupon detail."
      });

    expect(response.status).toBe(200);
    expect(response.body.resident).toMatchObject({
      id: "RBI-2024-0002",
      fullName: "Maria S. Santos",
      statusColor: "green"
    });
    expect(JSON.stringify(pool.queries.at(-1).params)).not.toContain("Confidential Lupon detail");
  });

  it("blocks Department users from updating resident status", async () => {
    const pool = createPool([[profileRows.department], [profileRows.department]]);
    const app = createApp(pool);
    const cookie = await loginAs(app, "department", "dept123");

    const response = await request(app)
      .patch("/api/residents/RBI-2024-0002")
      .set("Cookie", cookie)
      .send({ status: "green" });

    expect(response.status).toBe(403);
    expect(pool.queries).toHaveLength(2);
  });

  it("rejects unauthenticated resident status updates", async () => {
    const pool = createPool();
    const app = createApp(pool);

    const response = await request(app)
      .patch("/api/residents/RBI-2024-0002")
      .send({ status: "green" });

    expect(response.status).toBe(401);
    expect(response.body.error).toContain("Authentication is required");
    expect(pool.queries).toHaveLength(0);
  });

  it("rejects invalid resident status updates before writing to the database", async () => {
    const pool = createPool([[profileRows.lupon], [profileRows.lupon]]);
    const app = createApp(pool);
    const cookie = await loginAs(app, "lupon", "lupon123");

    const response = await request(app)
      .patch("/api/residents/RBI-2024-0002")
      .set("Cookie", cookie)
      .send({ status: "blue" });

    expect(response.status).toBe(400);
    expect(response.body.error).toContain("Invalid resident status");
    expect(pool.queries).toHaveLength(2);
  });

  it("rejects empty resident update payloads before writing to the database", async () => {
    const pool = createPool([[profileRows.lupon], [profileRows.lupon]]);
    const app = createApp(pool);
    const cookie = await loginAs(app, "lupon", "lupon123");

    const response = await request(app)
      .patch("/api/residents/RBI-2024-0002")
      .set("Cookie", cookie)
      .send({});

    expect(response.status).toBe(400);
    expect(response.body.error).toContain("At least one allowed resident field is required");
    expect(pool.queries).toHaveLength(2);
  });

  it("returns updated resident status to Department after a Lupon update", async () => {
    const pool = createResidentUpdatePool();
    const app = createApp(pool);
    const luponCookie = await loginAs(app, "lupon", "lupon123");

    const updateResponse = await request(app)
      .patch("/api/residents/RBI-2024-0002")
      .set("Cookie", luponCookie)
      .send({ status: "red" });

    expect(updateResponse.status).toBe(200);

    const departmentCookie = await loginAs(app, "department", "dept123");
    const departmentResponse = await request(app)
      .get("/api/residents/RBI-2024-0002")
      .set("Cookie", departmentCookie);

    expect(departmentResponse.status).toBe(200);
    expect(departmentResponse.body.resident).toMatchObject({
      id: "RBI-2024-0002",
      statusColor: "red"
    });
    expect(departmentResponse.body.resident).not.toHaveProperty("remarks");
    expect(departmentResponse.body.resident).not.toHaveProperty("caseReason");
    expect(departmentResponse.body).not.toHaveProperty("luponCases");
    expect(departmentResponse.body).not.toHaveProperty("luponCaseNotes");
    expect(JSON.stringify(departmentResponse.body)).not.toContain("confidentialSummary");
    expect(JSON.stringify(departmentResponse.body)).not.toContain("noteBody");
    expect(JSON.stringify(departmentResponse.body)).not.toContain("remarks");
    expect(JSON.stringify(departmentResponse.body)).not.toContain("caseReason");
  });

  it("returns updated non-confidential resident fields to Department after a Lupon update", async () => {
    const pool = createResidentUpdatePool();
    const app = createApp(pool);
    const luponCookie = await loginAs(app, "lupon", "lupon123");

    const updateResponse = await request(app)
      .patch("/api/residents/RBI-2024-0002")
      .set("Cookie", luponCookie)
      .send({
        address: "Purok 9, Nazareth",
        contactNumber: "09998887777",
        additionalInformation: "Address verified by Lupon staff.",
        sectors: ["PWD", "Registered Voter"],
        registeredVoter: true,
        precinctNumber: "0999A",
        remarks: "Do not expose this resident-local remark.",
        caseReason: "Do not expose this resident-local case reason."
      });

    expect(updateResponse.status).toBe(200);

    const departmentCookie = await loginAs(app, "department", "dept123");
    const departmentResponse = await request(app)
      .get("/api/residents/RBI-2024-0002")
      .set("Cookie", departmentCookie);

    expect(departmentResponse.status).toBe(200);
    expect(departmentResponse.body.resident).toMatchObject({
      id: "RBI-2024-0002",
      address: "Purok 9, Nazareth",
      contactNumber: "09998887777",
      additionalInformation: "Address verified by Lupon staff.",
      sectors: ["PWD", "Registered Voter"],
      registeredVoter: true,
      precinctNumber: "0999A"
    });
    expect(departmentResponse.body.resident).not.toHaveProperty("remarks");
    expect(departmentResponse.body.resident).not.toHaveProperty("caseReason");
    expect(departmentResponse.body).not.toHaveProperty("luponCases");
    expect(departmentResponse.body).not.toHaveProperty("luponCaseNotes");
    expect(JSON.stringify(departmentResponse.body)).not.toContain("confidentialSummary");
    expect(JSON.stringify(departmentResponse.body)).not.toContain("noteBody");
    expect(JSON.stringify(departmentResponse.body)).not.toContain("Do not expose");
  });
});
