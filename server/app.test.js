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
    const app = createApp(createPool([[profileRows.department], [profileRows.department]]));
    const cookie = await loginAs(app, "department", "dept123");

    const response = await request(app).get("/api/lupon/cases").set("Cookie", cookie);

    expect(response.status).toBe(403);
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
    expect(response.body).not.toHaveProperty("luponCases");
    expect(response.body).not.toHaveProperty("luponCaseNotes");
    expect(JSON.stringify(response.body)).not.toContain("confidentialSummary");
    expect(JSON.stringify(response.body)).not.toContain("noteBody");
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
});
