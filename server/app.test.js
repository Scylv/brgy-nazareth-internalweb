import request from "supertest";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createApp } from "./app.js";

function createPool(rowsByQuery = []) {
  const queries = [];

  return {
    queries,
    async query(sql, params = []) {
      queries.push({ sql, params });

      if (sql.includes("INSERT INTO audit_logs")) {
        return {
          rows: [],
          rowCount: 1
        };
      }

      const rows = rowsByQuery[queries.length - 1] ?? [];
      return {
        rows,
        rowCount: rows.length
      };
    }
  };
}

function findAuditQueries(pool) {
  return pool.queries.filter((query) => query.sql.includes("INSERT INTO audit_logs"));
}

function getAuditMetadata(auditQuery) {
  return auditQuery?.params?.[5] ?? {};
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

      if (sql.includes("INSERT INTO audit_logs")) {
        return {
          rows: [],
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

const TRUSTED_ORIGIN = "https://barangay-staff.example.test";

async function loginAs(app, username, password) {
  const response = await request(app)
    .post("/api/auth/login")
    .set("Origin", TRUSTED_ORIGIN)
    .send({ username, password });

  expect(response.status, JSON.stringify(response.body)).toBe(200);
  expect(response.headers["set-cookie"]?.[0]).toContain("barangay_session=");

  return response.headers["set-cookie"];
}

beforeEach(() => {
  vi.stubEnv("AUTH_SESSION_SECRET", "test-auth-session-secret");
  vi.stubEnv("CORS_ORIGINS", TRUSTED_ORIGIN);
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

    const response = await request(app)
      .post("/api/auth/login")
      .set("Origin", TRUSTED_ORIGIN)
      .send({
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

    const response = await request(app)
      .post("/api/auth/login")
      .set("Origin", TRUSTED_ORIGIN)
      .send({
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

    const response = await request(app)
      .post("/api/auth/login")
      .set("Origin", TRUSTED_ORIGIN)
      .send({
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

  it("rejects login requests with a missing origin", async () => {
    vi.stubEnv("NODE_ENV", "staging");
    const pool = createPool([[profileRows.department]]);
    const app = createApp(pool);

    const response = await request(app).post("/api/auth/login").send({
      username: "department",
      password: "dept123"
    });

    expect(response.status).toBe(403);
    expect(response.body.error).toContain("trusted origin");
    expect(pool.queries).toHaveLength(0);
  });

  it("rejects login requests from an untrusted origin", async () => {
    vi.stubEnv("NODE_ENV", "staging");
    const pool = createPool([[profileRows.department]]);
    const app = createApp(pool);

    const response = await request(app)
      .post("/api/auth/login")
      .set("Origin", "https://attacker.example.test")
      .send({
        username: "department",
        password: "dept123"
      });

    expect(response.status).toBe(403);
    expect(response.body.error).toContain("trusted origin");
    expect(pool.queries).toHaveLength(0);
  });

  it("rejects an invalid password for a database user", async () => {
    const app = createApp(createPool([[profileRows.department]]));

    const response = await request(app)
      .post("/api/auth/login")
      .set("Origin", TRUSTED_ORIGIN)
      .send({
        username: "department",
        password: "wrong-password"
      });

    expect(response.status).toBe(401);
    expect(response.body.error).toContain("Invalid username or password");
    expect(response.headers["set-cookie"]).toBeUndefined();
  });

  it("rate limits repeated invalid login attempts", async () => {
    const pool = createPool(Array.from({ length: 5 }, () => [profileRows.department]));
    const app = createApp(pool);

    for (let attempt = 0; attempt < 5; attempt += 1) {
      const response = await request(app)
        .post("/api/auth/login")
        .set("Origin", TRUSTED_ORIGIN)
        .send({
          username: "department",
          password: "wrong-password"
        });

      expect(response.status).toBe(401);
    }

    const response = await request(app)
      .post("/api/auth/login")
      .set("Origin", TRUSTED_ORIGIN)
      .send({
        username: "department",
        password: "wrong-password"
      });

    expect(response.status).toBe(429);
    expect(response.body.error).toContain("Too many login attempts");
    expect(pool.queries).toHaveLength(5);
  });

  it("rejects empty login input before querying the database", async () => {
    const pool = createPool();
    const app = createApp(pool);

    const response = await request(app)
      .post("/api/auth/login")
      .set("Origin", TRUSTED_ORIGIN)
      .send({
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

  it("rejects unauthenticated logout requests", async () => {
    const app = createApp(createPool());

    const response = await request(app)
      .post("/api/auth/logout")
      .set("Origin", TRUSTED_ORIGIN);

    expect(response.status).toBe(401);
    expect(response.body.error).toContain("Authentication is required");
  });

  it("rejects authenticated logout requests with a missing origin", async () => {
    const app = createApp(createPool([[profileRows.department], [profileRows.department]]));
    const cookie = await loginAs(app, "department", "dept123");

    const response = await request(app)
      .post("/api/auth/logout")
      .set("Cookie", cookie);

    expect(response.status).toBe(403);
    expect(response.body.error).toContain("trusted origin");
  });

  it("rejects authenticated logout requests from an untrusted origin", async () => {
    const app = createApp(createPool([[profileRows.department], [profileRows.department]]));
    const cookie = await loginAs(app, "department", "dept123");

    const response = await request(app)
      .post("/api/auth/logout")
      .set("Cookie", cookie)
      .set("Origin", "https://attacker.example.test");

    expect(response.status).toBe(403);
    expect(response.body.error).toContain("trusted origin");
  });

  it("clears the session cookie on authenticated logout from a trusted origin", async () => {
    const app = createApp(createPool([[profileRows.department], [profileRows.department]]));
    const cookie = await loginAs(app, "department", "dept123");

    const response = await request(app)
      .post("/api/auth/logout")
      .set("Cookie", cookie)
      .set("Origin", TRUSTED_ORIGIN);

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

  it("does not require an origin header for protected GET requests", async () => {
    const pool = createPool([[profileRows.department], [profileRows.department], [residentRow]]);
    const app = createApp(pool);
    const cookie = await loginAs(app, "department", "dept123");

    const response = await request(app)
      .get("/api/residents/RBI-2024-0002")
      .set("Cookie", cookie);

    expect(response.status).toBe(200);
    expect(response.body.resident).toMatchObject({
      id: "RBI-2024-0002",
      statusColor: "yellow"
    });
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
    expect(response.headers["access-control-allow-headers"]).toContain("X-Document-Title");
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
    expect(JSON.stringify(response.body)).not.toContain("caseTitle");
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
        status: "active",
        createdAt: "2026-05-01T00:00:00.000Z",
        updatedAt: "2026-05-02T00:00:00.000Z"
      },
      {
        id: "dept-1",
        username: "department",
        displayName: "Elena Ledesma",
        role: "department",
        status: "active",
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
          case_title: "Imported resident verification",
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
    expect(response.body.luponCases[0].caseTitle).toBe("Imported resident verification");
    expect(response.body.luponCases[0].confidentialSummary).toContain("Address mismatch");
    expect(JSON.stringify(response.body)).not.toContain("noteBody");
  });

  it("writes a safe audit record when Lupon creates a case", async () => {
    const confidentialSummary = "Do not store this confidential case summary in audit metadata.";
    const pool = createPool([
      [profileRows.lupon],
      [profileRows.lupon],
      [residentRow],
      [
        {
          id: "LC-2026-0003",
          resident_id: "RBI-2024-0002",
          case_number: "LPN-2026-0003",
          case_title: "Address Verification",
          case_type: "Address Verification",
          status: "open",
          priority: "high",
          confidential_summary: confidentialSummary,
          opened_at: "2026-05-21",
          resolved_at: null,
          assigned_lupon_profile_id: "lupon-1",
          created_by_profile_id: "lupon-1",
          created_at: "2026-05-21T00:00:00.000Z",
          updated_at: "2026-05-21T00:00:00.000Z"
        }
      ]
    ]);
    const app = createApp(pool);
    const cookie = await loginAs(app, "lupon", "lupon123");

    const response = await request(app)
      .post("/api/lupon/cases")
      .set("Cookie", cookie)
      .set("Origin", TRUSTED_ORIGIN)
      .send({
        residentId: "RBI-2024-0002",
        caseNumber: "LPN-2026-0003",
        caseType: "Address Verification",
        status: "open",
        priority: "high",
        confidentialSummary,
        openedAt: "2026-05-21"
      });

    expect(response.status).toBe(201);
    expect(response.body.luponCase.confidentialSummary).toBe(confidentialSummary);

    const [auditQuery] = findAuditQueries(pool);
    const metadata = getAuditMetadata(auditQuery);

    expect(auditQuery.params.slice(1, 5)).toEqual([
      "lupon-1",
      "lupon_case.created",
      "lupon_case",
      "LC-2026-0003"
    ]);
    expect(metadata).toMatchObject({
      actorRole: "lupon",
      residentId: "RBI-2024-0002",
      caseNumber: "LPN-2026-0003",
      caseType: "Address Verification",
      status: "open",
      priority: "high"
    });
    expect(JSON.stringify(metadata)).not.toContain(confidentialSummary);
  });

  it("lets Lupon create a case for a resident with no active case", async () => {
    const confidentialSummary = "Verify the imported resident record before clearance.";
    const pool = createPool([
      [profileRows.lupon],
      [profileRows.lupon],
      [residentRow],
      [
        {
          id: "LC-2026-0004",
          resident_id: "RBI-2024-0002",
          case_number: "LPN-2026-0004",
          case_title: "Imported resident verification",
          case_type: "Resident Record Case",
          status: "open",
          priority: "normal",
          confidential_summary: confidentialSummary,
          opened_at: "2026-05-27",
          resolved_at: null,
          assigned_lupon_profile_id: "lupon-1",
          created_by_profile_id: "lupon-1",
          created_at: "2026-05-27T00:00:00.000Z",
          updated_at: "2026-05-27T00:00:00.000Z"
        }
      ]
    ]);
    const app = createApp(pool);
    const cookie = await loginAs(app, "lupon", "lupon123");

    const response = await request(app)
      .post("/api/lupon/cases")
      .set("Cookie", cookie)
      .set("Origin", TRUSTED_ORIGIN)
      .send({
        residentId: "RBI-2024-0002",
        caseTitle: "Imported resident verification",
        confidentialSummary
      });

    expect(response.status, JSON.stringify(response.body)).toBe(201);
    expect(response.body.luponCase).toMatchObject({
      residentId: "RBI-2024-0002",
      caseTitle: "Imported resident verification",
      caseType: "Resident Record Case",
      confidentialSummary
    });

    const [auditQuery] = findAuditQueries(pool);
    const metadata = getAuditMetadata(auditQuery);

    expect(metadata).toMatchObject({
      actorRole: "lupon",
      residentId: "RBI-2024-0002",
      caseTitle: "Imported resident verification",
      caseType: "Resident Record Case",
      status: "open"
    });
    expect(JSON.stringify(metadata)).not.toContain(confidentialSummary);
  });

  it("lets Lupon update a case title and summary without storing confidential text in audit metadata", async () => {
    const updatedSummary = "Updated confidential summary must not be audited.";
    const pool = createPool([
      [profileRows.lupon],
      [profileRows.lupon],
      [
        {
          id: "LC-2026-0003",
          resident_id: "RBI-2024-0002",
          case_number: "LPN-2026-0003",
          case_title: "Updated case title",
          case_type: "Address Verification",
          status: "open",
          priority: "high",
          confidential_summary: updatedSummary,
          opened_at: "2026-05-21",
          resolved_at: null,
          assigned_lupon_profile_id: "lupon-1",
          created_by_profile_id: "lupon-1",
          created_at: "2026-05-21T00:00:00.000Z",
          updated_at: "2026-05-22T00:00:00.000Z"
        }
      ]
    ]);
    const app = createApp(pool);
    const cookie = await loginAs(app, "lupon", "lupon123");

    const response = await request(app)
      .patch("/api/lupon/cases/LC-2026-0003")
      .set("Cookie", cookie)
      .set("Origin", TRUSTED_ORIGIN)
      .send({
        caseTitle: "Updated case title",
        confidentialSummary: updatedSummary
      });

    expect(response.status).toBe(200);
    expect(response.body.luponCase.caseTitle).toBe("Updated case title");
    expect(response.body.luponCase.confidentialSummary).toBe(updatedSummary);

    const [auditQuery] = findAuditQueries(pool);
    const metadata = getAuditMetadata(auditQuery);

    expect(auditQuery.params.slice(1, 5)).toEqual([
      "lupon-1",
      "lupon_case.details_updated",
      "lupon_case",
      "LC-2026-0003"
    ]);
    expect(metadata).toMatchObject({
      actorRole: "lupon",
      changedFields: ["caseTitle", "confidentialSummary"],
      caseTitle: "Updated case title"
    });
    expect(JSON.stringify(metadata)).not.toContain(updatedSummary);
  });

  it("lets Lupon resolve an open case while preserving confidential case history", async () => {
    const confidentialSummary = "Resolved confidential history must remain stored.";
    const pool = createPool([
      [profileRows.lupon],
      [profileRows.lupon],
      [
        {
          id: "LC-2026-0003",
          resident_id: "RBI-2024-0002",
          case_number: "LPN-2026-0003",
          case_title: "Noise complaint",
          case_type: "Community Dispute",
          status: "resolved",
          priority: "normal",
          confidential_summary: confidentialSummary,
          opened_at: "2026-05-21",
          resolved_at: "2026-05-27",
          resolved_by_profile_id: "lupon-1",
          assigned_lupon_profile_id: "lupon-1",
          created_by_profile_id: "lupon-1",
          created_at: "2026-05-21T00:00:00.000Z",
          updated_at: "2026-05-27T00:00:00.000Z"
        }
      ]
    ]);
    const app = createApp(pool);
    const cookie = await loginAs(app, "lupon", "lupon123");

    const response = await request(app)
      .post("/api/lupon/cases/LC-2026-0003/resolve")
      .set("Cookie", cookie)
      .set("Origin", TRUSTED_ORIGIN)
      .send({});

    expect(response.status, JSON.stringify(response.body)).toBe(200);
    expect(response.body.luponCase).toMatchObject({
      id: "LC-2026-0003",
      caseTitle: "Noise complaint",
      caseNumber: "LPN-2026-0003",
      status: "resolved",
      confidentialSummary,
      resolvedAt: "2026-05-27",
      resolvedByProfileId: "lupon-1"
    });

    const updateQuery = pool.queries.find((query) => query.sql.includes("UPDATE lupon_cases"));
    expect(updateQuery.sql).toContain("status = 'resolved'");
    expect(updateQuery.sql).toContain("resolved_at");
    expect(updateQuery.sql).toContain("resolved_by_profile_id");

    const [auditQuery] = findAuditQueries(pool);
    const metadata = getAuditMetadata(auditQuery);

    expect(auditQuery.params.slice(1, 5)).toEqual([
      "lupon-1",
      "lupon_case.resolved",
      "lupon_case",
      "LC-2026-0003"
    ]);
    expect(metadata).toMatchObject({
      actorRole: "lupon",
      status: "resolved",
      caseTitle: "Noise complaint",
      caseNumber: "LPN-2026-0003"
    });
    expect(JSON.stringify(metadata)).not.toContain(confidentialSummary);
  });

  it("does not allow Department to update Lupon case summaries", async () => {
    const pool = createPool([[profileRows.department], [profileRows.department]]);
    const app = createApp(pool);
    const cookie = await loginAs(app, "department", "dept123");

    const response = await request(app)
      .patch("/api/lupon/cases/LC-2026-0003")
      .set("Cookie", cookie)
      .set("Origin", TRUSTED_ORIGIN)
      .send({
        confidentialSummary: "Department must not save this."
      });

    expect(response.status).toBe(403);
    expect(JSON.stringify(response.body)).not.toContain("Department must not save this.");
    expect(pool.queries.some((query) => query.sql.includes("UPDATE lupon_cases"))).toBe(false);
  });

  it("does not allow Department to resolve Lupon cases", async () => {
    const pool = createPool([[profileRows.department], [profileRows.department]]);
    const app = createApp(pool);
    const cookie = await loginAs(app, "department", "dept123");

    const response = await request(app)
      .post("/api/lupon/cases/LC-2026-0003/resolve")
      .set("Cookie", cookie)
      .set("Origin", TRUSTED_ORIGIN)
      .send({});

    expect(response.status).toBe(403);
    expect(JSON.stringify(response.body)).not.toContain("confidential");
    expect(pool.queries.some((query) => query.sql.includes("UPDATE lupon_cases"))).toBe(false);
  });

  it("does not allow Department to create Lupon cases", async () => {
    const pool = createPool([[profileRows.department], [profileRows.department]]);
    const app = createApp(pool);
    const cookie = await loginAs(app, "department", "dept123");

    const response = await request(app)
      .post("/api/lupon/cases")
      .set("Cookie", cookie)
      .set("Origin", TRUSTED_ORIGIN)
      .send({
        residentId: "RBI-2024-0002",
        caseTitle: "Department must not create this",
        confidentialSummary: "Department must not send this."
      });

    expect(response.status).toBe(403);
    expect(JSON.stringify(response.body)).not.toContain("Department must not");
    expect(pool.queries.some((query) => query.sql.includes("INSERT INTO lupon_cases"))).toBe(false);
  });

  it("writes a safe audit record when Lupon creates a confidential note", async () => {
    const noteBody = "Do not store this confidential note body in audit metadata.";
    const pool = createPool([
      [profileRows.lupon],
      [profileRows.lupon],
      [
        {
          id: "LCN-2026-0003",
          lupon_case_id: "LC-2026-0003",
          note_type: "internal",
          note_body: noteBody,
          created_by_profile_id: "lupon-1",
          created_at: "2026-05-21T01:00:00.000Z"
        }
      ]
    ]);
    const app = createApp(pool);
    const cookie = await loginAs(app, "lupon", "lupon123");

    const response = await request(app)
      .post("/api/lupon/cases/LC-2026-0003/notes")
      .set("Cookie", cookie)
      .set("Origin", TRUSTED_ORIGIN)
      .send({
        noteType: "internal",
        noteBody
      });

    expect(response.status).toBe(201);
    expect(response.body.luponCaseNote.noteBody).toBe(noteBody);

    const [auditQuery] = findAuditQueries(pool);
    const metadata = getAuditMetadata(auditQuery);

    expect(auditQuery.params.slice(1, 5)).toEqual([
      "lupon-1",
      "lupon_case_note.created",
      "lupon_case_note",
      "LCN-2026-0003"
    ]);
    expect(metadata).toMatchObject({
      actorRole: "lupon",
      luponCaseId: "LC-2026-0003",
      noteType: "internal"
    });
    expect(JSON.stringify(metadata)).not.toContain(noteBody);
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

  it("does not return resolved cases as active resident case context", async () => {
    const pool = createPool([
      [profileRows.lupon],
      [profileRows.lupon],
      [residentRow],
      [],
      []
    ]);
    const app = createApp(pool);
    const cookie = await loginAs(app, "lupon", "lupon123");

    const response = await request(app)
      .get("/api/residents/RBI-2024-0002")
      .set("Cookie", cookie);

    expect(response.status).toBe(200);
    expect(response.body.luponCases).toEqual([]);
    expect(response.body.luponCaseNotes).toEqual([]);
    const luponCaseQuery = pool.queries.find((query) =>
      query.sql.includes("FROM lupon_cases")
    );
    expect(luponCaseQuery.sql).toContain("status IN ('open', 'under_mediation')");
    expect(JSON.stringify(response.body)).not.toContain("Resolved confidential history");
  });

  it("rejects invalid document request statuses before writing to the database", async () => {
    const pool = createPool([[profileRows.department], [profileRows.department]]);
    const app = createApp(pool);
    const cookie = await loginAs(app, "department", "dept123");

    const response = await request(app)
      .post("/api/document-requests")
      .set("Cookie", cookie)
      .set("Origin", TRUSTED_ORIGIN)
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

  it("allows trusted-origin protected mutating requests", async () => {
    vi.stubEnv("CORS_ORIGINS", TRUSTED_ORIGIN);
    const pool = createPool([
      [profileRows.department],
      [profileRows.department],
      [
        {
          id: "DOC-2026-0009",
          resident_id: "RBI-2024-0001",
          barangay_document_id: "BDOC-001",
          barangay_document_name: "Barangay Clearance",
          purpose: "Local employment requirement",
          status: "pending",
          request_date: "2026-05-20",
          release_date: null,
          expiry_date: null,
          processed_by_profile_id: "dept-1",
          processed_by_name: "Elena Ledesma",
          created_at: "2026-05-20T00:00:00.000Z",
          updated_at: "2026-05-20T00:00:00.000Z"
        }
      ]
    ]);
    const app = createApp(pool);
    const cookie = await loginAs(app, "department", "dept123");

    const response = await request(app)
      .post("/api/document-requests")
      .set("Cookie", cookie)
      .set("Origin", TRUSTED_ORIGIN)
      .send({
        residentId: "RBI-2024-0001",
        barangayDocumentId: "BDOC-001",
        purpose: "Local employment requirement",
        requestDate: "2026-05-20"
      });

    expect(response.status).toBe(201);
    expect(response.body.documentRequest).toMatchObject({
      id: "DOC-2026-0009",
      processedByProfileId: "dept-1"
    });
  });

  it("blocks protected mutating requests with a missing origin or referer", async () => {
    vi.stubEnv("CORS_ORIGINS", TRUSTED_ORIGIN);
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
        requestDate: "2026-05-20"
      });

    expect(response.status).toBe(403);
    expect(response.body.error).toContain("trusted origin");
    expect(pool.queries).toHaveLength(2);
  });

  it("blocks protected mutating requests from an untrusted origin", async () => {
    vi.stubEnv("CORS_ORIGINS", TRUSTED_ORIGIN);
    const pool = createPool([[profileRows.department], [profileRows.department]]);
    const app = createApp(pool);
    const cookie = await loginAs(app, "department", "dept123");

    const response = await request(app)
      .post("/api/document-requests")
      .set("Cookie", cookie)
      .set("Origin", "https://attacker.example.test")
      .send({
        residentId: "RBI-2024-0001",
        barangayDocumentId: "BDOC-001",
        purpose: "Local employment requirement",
        requestDate: "2026-05-20"
      });

    expect(response.status).toBe(403);
    expect(response.body.error).toContain("trusted origin");
    expect(pool.queries).toHaveLength(2);
  });

  it("allows protected mutating requests with a trusted referer when Origin is missing", async () => {
    const pool = createPool([[profileRows.department], [profileRows.department]]);
    const app = createApp(pool);
    const cookie = await loginAs(app, "department", "dept123");

    const response = await request(app)
      .post("/api/document-requests")
      .set("Cookie", cookie)
      .set("Referer", `${TRUSTED_ORIGIN}/department`)
      .send({
        residentId: "RBI-2024-0001",
        purpose: "Local employment requirement"
      });

    expect(response.status).toBe(400);
    expect(response.body.fields).toEqual(["barangayDocumentId", "requestDate"]);
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
      .set("Origin", TRUSTED_ORIGIN)
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
    const documentRequestInsert = pool.queries.find((query) =>
      query.sql.includes("INSERT INTO document_requests")
    );

    expect(documentRequestInsert.sql).toContain("documents.name AS barangay_document_name");
    expect(documentRequestInsert.sql).toContain("profiles.display_name AS processed_by_name");
    expect(documentRequestInsert.params.slice(1)).toEqual([
      "RBI-2024-0001",
      "BDOC-001",
      null,
      "Local employment requirement",
      "pending",
      "2026-05-19",
      null,
      null,
      "dept-1"
    ]);

    const [auditQuery] = findAuditQueries(pool);
    const metadata = getAuditMetadata(auditQuery);

    expect(auditQuery.params.slice(1, 4)).toEqual([
      "dept-1",
      "document_request.created",
      "document_request"
    ]);
    expect(auditQuery.params[4]).toBe("DOC-2026-0008");
    expect(metadata).toMatchObject({
      actorRole: "department",
      residentId: "RBI-2024-0001",
      barangayDocumentId: "BDOC-001",
      status: "pending"
    });
  });

  it("rejects pending document requests when release date is before request date", async () => {
    const pool = createPool([[profileRows.department], [profileRows.department]]);
    const app = createApp(pool);
    const cookie = await loginAs(app, "department", "dept123");

    const response = await request(app)
      .post("/api/document-requests")
      .set("Cookie", cookie)
      .set("Origin", TRUSTED_ORIGIN)
      .send({
        residentId: "RBI-2024-0001",
        barangayDocumentId: "BDOC-001",
        purpose: "Local employment requirement",
        requestDate: "2026-05-27",
        releaseDate: "2026-05-19",
        status: "pending"
      });

    expect(response.status).toBe(422);
    expect(response.body.error).toContain("Release date cannot be before request date");
    expect(pool.queries.some((query) => query.sql.includes("INSERT INTO document_requests"))).toBe(false);
  });

  it("rejects document requests when expiry date is before request date", async () => {
    const pool = createPool([[profileRows.department], [profileRows.department]]);
    const app = createApp(pool);
    const cookie = await loginAs(app, "department", "dept123");

    const response = await request(app)
      .post("/api/document-requests")
      .set("Cookie", cookie)
      .set("Origin", TRUSTED_ORIGIN)
      .send({
        residentId: "RBI-2024-0001",
        barangayDocumentId: "BDOC-001",
        purpose: "Local employment requirement",
        requestDate: "2026-05-27",
        expiryDate: "2026-05-19",
        status: "pending"
      });

    expect(response.status).toBe(422);
    expect(response.body.error).toContain("Expiry date cannot be before request date");
    expect(pool.queries.some((query) => query.sql.includes("INSERT INTO document_requests"))).toBe(false);
  });

  it("allows valid pending document requests without a release date", async () => {
    const pool = createPool([
      [profileRows.department],
      [profileRows.department],
      [
        {
          id: "DOC-2026-0015",
          resident_id: "RBI-2024-0001",
          barangay_document_id: "BDOC-001",
          barangay_document_name: "Barangay Clearance",
          purpose: "Local employment requirement",
          status: "pending",
          request_date: "2026-05-27",
          release_date: null,
          expiry_date: "2026-06-27",
          processed_by_profile_id: "dept-1",
          processed_by_name: "Elena Ledesma",
          created_at: "2026-05-27T00:00:00.000Z",
          updated_at: "2026-05-27T00:00:00.000Z"
        }
      ]
    ]);
    const app = createApp(pool);
    const cookie = await loginAs(app, "department", "dept123");

    const response = await request(app)
      .post("/api/document-requests")
      .set("Cookie", cookie)
      .set("Origin", TRUSTED_ORIGIN)
      .send({
        residentId: "RBI-2024-0001",
        barangayDocumentId: "BDOC-001",
        purpose: "Local employment requirement",
        requestDate: "2026-05-27",
        expiryDate: "2026-06-27",
        status: "pending"
      });

    expect(response.status).toBe(201);
    expect(response.body.documentRequest).toMatchObject({
      id: "DOC-2026-0015",
      status: "pending",
      releaseDate: null
    });
  });

  it("allows released document requests with a valid release date", async () => {
    const pool = createPool([
      [profileRows.department],
      [profileRows.department],
      [
        {
          id: "DOC-2026-0016",
          resident_id: "RBI-2024-0001",
          barangay_document_id: "BDOC-001",
          barangay_document_name: "Barangay Clearance",
          purpose: "Local employment requirement",
          status: "released",
          request_date: "2026-05-19",
          release_date: "2026-05-27",
          expiry_date: "2026-06-27",
          processed_by_profile_id: "dept-1",
          processed_by_name: "Elena Ledesma",
          created_at: "2026-05-27T00:00:00.000Z",
          updated_at: "2026-05-27T00:00:00.000Z"
        }
      ]
    ]);
    const app = createApp(pool);
    const cookie = await loginAs(app, "department", "dept123");

    const response = await request(app)
      .post("/api/document-requests")
      .set("Cookie", cookie)
      .set("Origin", TRUSTED_ORIGIN)
      .send({
        residentId: "RBI-2024-0001",
        barangayDocumentId: "BDOC-001",
        purpose: "Local employment requirement",
        requestDate: "2026-05-19",
        releaseDate: "2026-05-27",
        expiryDate: "2026-06-27",
        status: "released"
      });

    expect(response.status).toBe(201);
    expect(response.body.documentRequest).toMatchObject({
      status: "released",
      releaseDate: "2026-05-27"
    });
  });

  it("rejects Other document requests without a custom title", async () => {
    const pool = createPool([[profileRows.department], [profileRows.department]]);
    const app = createApp(pool);
    const cookie = await loginAs(app, "department", "dept123");

    const response = await request(app)
      .post("/api/document-requests")
      .set("Cookie", cookie)
      .set("Origin", TRUSTED_ORIGIN)
      .send({
        residentId: "RBI-2024-0001",
        barangayDocumentId: "BDOC-OTHER",
        purpose: "Custom certification",
        requestDate: "2026-05-27",
        customDocumentTitle: "   "
      });

    expect(response.status).toBe(422);
    expect(response.body.error).toContain("Custom document title is required");
    expect(pool.queries.some((query) => query.sql.includes("INSERT INTO document_requests"))).toBe(false);
  });

  it("allows Other document requests with a trimmed custom title", async () => {
    const pool = createPool([
      [profileRows.department],
      [profileRows.department],
      [
        {
          id: "DOC-2026-0017",
          resident_id: "RBI-2024-0001",
          barangay_document_id: "BDOC-OTHER",
          barangay_document_name: "Other",
          custom_document_title: "Travel Certification",
          purpose: "Custom certification",
          status: "pending",
          request_date: "2026-05-27",
          release_date: null,
          expiry_date: null,
          processed_by_profile_id: "dept-1",
          processed_by_name: "Elena Ledesma",
          created_at: "2026-05-27T00:00:00.000Z",
          updated_at: "2026-05-27T00:00:00.000Z"
        }
      ]
    ]);
    const app = createApp(pool);
    const cookie = await loginAs(app, "department", "dept123");

    const response = await request(app)
      .post("/api/document-requests")
      .set("Cookie", cookie)
      .set("Origin", TRUSTED_ORIGIN)
      .send({
        residentId: "RBI-2024-0001",
        barangayDocumentId: "BDOC-OTHER",
        customDocumentTitle: "  Travel Certification  ",
        purpose: "Custom certification",
        requestDate: "2026-05-27"
      });

    expect(response.status).toBe(201);
    expect(response.body.documentRequest).toMatchObject({
      barangayDocumentId: "BDOC-OTHER",
      barangayDocumentName: "Other",
      customDocumentTitle: "Travel Certification"
    });
    const documentRequestInsert = pool.queries.find((query) =>
      query.sql.includes("INSERT INTO document_requests")
    );
    expect(documentRequestInsert.params).toContain("Travel Certification");
  });

  it("rejects missing document request fields before writing to the database", async () => {
    const pool = createPool([[profileRows.department], [profileRows.department]]);
    const app = createApp(pool);
    const cookie = await loginAs(app, "department", "dept123");

    const response = await request(app)
      .post("/api/document-requests")
      .set("Cookie", cookie)
      .set("Origin", TRUSTED_ORIGIN)
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
      .set("Origin", TRUSTED_ORIGIN)
      .send({
        residentId: "RBI-2024-0001",
        barangayDocumentId: "BDOC-001",
        purpose: "Local employment requirement",
        requestDate: "2026-05-19"
      });

    expect(response.status).toBe(403);
    expect(pool.queries).toHaveLength(2);
  });

  it("allows Department users to mark pending document requests as processing", async () => {
    const pool = createPool([
      [profileRows.department],
      [profileRows.department],
      [
        {
          id: "DOC-2026-0010",
          resident_id: "RBI-2024-0001",
          barangay_document_id: "BDOC-001",
          barangay_document_name: "Barangay Clearance",
          purpose: "Local employment requirement",
          status: "pending",
          request_date: "2026-05-20",
          release_date: null,
          expiry_date: null,
          processed_by_profile_id: "dept-1",
          processed_by_name: "Elena Ledesma",
          created_at: "2026-05-20T00:00:00.000Z",
          updated_at: "2026-05-20T00:00:00.000Z"
        }
      ],
      [
        {
          id: "DOC-2026-0010",
          resident_id: "RBI-2024-0001",
          barangay_document_id: "BDOC-001",
          barangay_document_name: "Barangay Clearance",
          purpose: "Local employment requirement",
          status: "processing",
          request_date: "2026-05-20",
          release_date: null,
          expiry_date: null,
          processed_by_profile_id: "dept-1",
          processed_by_name: "Elena Ledesma",
          created_at: "2026-05-20T00:00:00.000Z",
          updated_at: "2026-05-21T00:00:00.000Z"
        }
      ]
    ]);
    const app = createApp(pool);
    const cookie = await loginAs(app, "department", "dept123");

    const response = await request(app)
      .post("/api/document-requests/DOC-2026-0010/mark-processing")
      .set("Cookie", cookie)
      .set("Origin", TRUSTED_ORIGIN)
      .send({});

    expect(response.status).toBe(200);
    expect(response.body.documentRequest.status).toBe("processing");
    const updateQuery = pool.queries.find((query) => query.sql.includes("UPDATE document_requests"));
    expect(updateQuery.params).toContain("DOC-2026-0010");
    expect(updateQuery.params).toContain("dept-1");
  });

  it("allows Department users to mark pending or processing requests as released and sets a missing release date", async () => {
    const pool = createPool([
      [profileRows.department],
      [profileRows.department],
      [
        {
          id: "DOC-2026-0011",
          resident_id: "RBI-2024-0001",
          barangay_document_id: "BDOC-003",
          barangay_document_name: "Barangay Indigency",
          purpose: "Medical assistance",
          status: "processing",
          request_date: "2026-05-20",
          release_date: null,
          expiry_date: null,
          processed_by_profile_id: "dept-1",
          processed_by_name: "Elena Ledesma",
          created_at: "2026-05-20T00:00:00.000Z",
          updated_at: "2026-05-20T00:00:00.000Z"
        }
      ],
      [
        {
          id: "DOC-2026-0011",
          resident_id: "RBI-2024-0001",
          barangay_document_id: "BDOC-003",
          barangay_document_name: "Barangay Indigency",
          purpose: "Medical assistance",
          status: "released",
          request_date: "2026-05-20",
          release_date: "2026-05-27",
          expiry_date: null,
          processed_by_profile_id: "dept-1",
          processed_by_name: "Elena Ledesma",
          created_at: "2026-05-20T00:00:00.000Z",
          updated_at: "2026-05-27T00:00:00.000Z"
        }
      ]
    ]);
    const app = createApp(pool);
    const cookie = await loginAs(app, "department", "dept123");

    const response = await request(app)
      .post("/api/document-requests/DOC-2026-0011/mark-released")
      .set("Cookie", cookie)
      .set("Origin", TRUSTED_ORIGIN)
      .send({});

    expect(response.status).toBe(200);
    expect(response.body.documentRequest).toMatchObject({
      id: "DOC-2026-0011",
      status: "released",
      releaseDate: "2026-05-27"
    });
    const updateQuery = pool.queries.find((query) => query.sql.includes("UPDATE document_requests"));
    expect(updateQuery.sql).toContain("COALESCE(release_date, CURRENT_DATE)");
  });

  it("allows Department users to archive requests with a reason instead of deleting them", async () => {
    const pool = createPool([
      [profileRows.department],
      [profileRows.department],
      [
        {
          id: "DOC-2026-0012",
          resident_id: "RBI-2024-0001",
          barangay_document_id: "BDOC-004",
          barangay_document_name: "Barangay ID",
          purpose: "ID replacement",
          status: "released",
          request_date: "2026-05-20",
          release_date: "2026-05-21",
          expiry_date: null,
          processed_by_profile_id: "dept-1",
          processed_by_name: "Elena Ledesma",
          created_at: "2026-05-20T00:00:00.000Z",
          updated_at: "2026-05-21T00:00:00.000Z"
        }
      ],
      [
        {
          id: "DOC-2026-0012",
          resident_id: "RBI-2024-0001",
          barangay_document_id: "BDOC-004",
          barangay_document_name: "Barangay ID",
          purpose: "ID replacement",
          status: "released",
          request_date: "2026-05-20",
          release_date: "2026-05-21",
          expiry_date: null,
          processed_by_profile_id: "dept-1",
          processed_by_name: "Elena Ledesma",
          archived_at: "2026-05-27T00:00:00.000Z",
          archived_by_profile_id: "dept-1",
          archive_reason: "Duplicate request",
          archive_note: "Same request encoded twice.",
          created_at: "2026-05-20T00:00:00.000Z",
          updated_at: "2026-05-27T00:00:00.000Z"
        }
      ]
    ]);
    const app = createApp(pool);
    const cookie = await loginAs(app, "department", "dept123");

    const response = await request(app)
      .post("/api/document-requests/DOC-2026-0012/archive")
      .set("Cookie", cookie)
      .set("Origin", TRUSTED_ORIGIN)
      .send({ reason: "Duplicate request", note: "Same request encoded twice." });

    expect(response.status).toBe(200);
    expect(response.body.documentRequest).toMatchObject({
      id: "DOC-2026-0012",
      archived: true,
      archiveReason: "Duplicate request"
    });
    const updateQuery = pool.queries.find((query) => query.sql.includes("UPDATE document_requests"));
    expect(updateQuery.sql).toContain("archived_at = now()");
    expect(updateQuery.sql).not.toContain("DELETE FROM document_requests");
    expect(updateQuery.params).toContain("Duplicate request");
  });

  it("hides archived document requests from active lists by default", async () => {
    const pool = createPool([[profileRows.department], [profileRows.department], []]);
    const app = createApp(pool);
    const cookie = await loginAs(app, "department", "dept123");

    const response = await request(app).get("/api/document-requests").set("Cookie", cookie);

    expect(response.status).toBe(200);
    const listQuery = pool.queries.find((query) => query.sql.includes("FROM document_requests"));
    expect(listQuery.sql).toContain("requests.archived_at IS NULL");
  });

  it("rejects invalid document request status transitions", async () => {
    const pool = createPool([
      [profileRows.department],
      [profileRows.department],
      [
        {
          id: "DOC-2026-0013",
          status: "released",
          release_date: "2026-05-21",
          archived_at: null
        }
      ]
    ]);
    const app = createApp(pool);
    const cookie = await loginAs(app, "department", "dept123");

    const response = await request(app)
      .post("/api/document-requests/DOC-2026-0013/mark-processing")
      .set("Cookie", cookie)
      .set("Origin", TRUSTED_ORIGIN)
      .send({});

    expect(response.status).toBe(409);
    expect(response.body.error).toContain("Invalid document request status transition");
    expect(pool.queries.some((query) => query.sql.includes("UPDATE document_requests"))).toBe(false);
  });

  it("rejects unauthenticated document request updates", async () => {
    const app = createApp(createPool());

    const response = await request(app)
      .post("/api/document-requests/DOC-2026-0014/mark-released")
      .set("Origin", TRUSTED_ORIGIN)
      .send({});

    expect(response.status).toBe(401);
  });

  it("allows Lupon users to update resident status and non-confidential fields", async () => {
    const pool = createPool([[profileRows.lupon], [profileRows.lupon], [residentRow], [{ ...residentRow, full_name: "Maria S. Santos", status_color: "green" }]]);
    const app = createApp(pool);
    const cookie = await loginAs(app, "lupon", "lupon123");

    const response = await request(app)
      .patch("/api/residents/RBI-2024-0002")
      .set("Cookie", cookie)
      .set("Origin", TRUSTED_ORIGIN)
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
    const residentUpdate = pool.queries.find((query) => query.sql.includes("UPDATE residents"));
    expect(JSON.stringify(residentUpdate.params)).not.toContain("Confidential Lupon detail");

    const [auditQuery] = findAuditQueries(pool);
    const metadata = getAuditMetadata(auditQuery);

    expect(auditQuery.params.slice(1, 5)).toEqual([
      "lupon-1",
      "resident.updated",
      "resident",
      "RBI-2024-0002"
    ]);
    expect(metadata).toMatchObject({
      actorRole: "lupon",
      previousStatusColor: "yellow",
      newStatusColor: "green"
    });
    expect(metadata.changedFields).toEqual(expect.arrayContaining(["fullName", "status"]));
    expect(JSON.stringify(metadata)).not.toContain("Confidential Lupon detail");
  });

  it("blocks Department users from updating resident status", async () => {
    const pool = createPool([[profileRows.department], [profileRows.department]]);
    const app = createApp(pool);
    const cookie = await loginAs(app, "department", "dept123");

    const response = await request(app)
      .patch("/api/residents/RBI-2024-0002")
      .set("Cookie", cookie)
      .set("Origin", TRUSTED_ORIGIN)
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
      .set("Origin", TRUSTED_ORIGIN)
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
      .set("Origin", TRUSTED_ORIGIN)
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
      .set("Origin", TRUSTED_ORIGIN)
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
      .set("Origin", TRUSTED_ORIGIN)
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
