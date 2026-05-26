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

const residentSeed = {
  id: "RBI-2026-0001",
  household_id: "HH-IMPORT-001",
  full_name: "Test Resident Alpha",
  birth_date: "1988-03-14",
  gender: "",
  civil_status: "Married",
  occupation: "Teacher",
  address: "Barangay Nazareth",
  exact_address: "House 1, Zone 1",
  contact_number: "09171234567",
  email: null,
  additional_information: null,
  sectors: ["Registered Voter"],
  registered_voter: true,
  precinct_number: "0012A",
  sitio: "Sitio One",
  status_color: "green",
  archived_at: null,
  archived_by_profile_id: null,
  created_at: "2026-05-26T00:00:00.000Z",
  updated_at: "2026-05-26T00:00:00.000Z",
  confidential_summary: "Lupon-only case summary must not leak.",
  note_body: "Lupon-only note must not leak."
};

function createAdminResidentPool() {
  const queries = [];
  const audits = [];
  const residents = new Map([[residentSeed.id, { ...residentSeed }]]);

  function findProfile(value) {
    return (
      Object.values(profiles).find((profile) => profile.id === value || profile.username === value) ??
      null
    );
  }

  return {
    audits,
    queries,
    residents,
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

      if (sql.includes("FROM profiles")) {
        const profile = findProfile(params[0]);
        return { rows: profile ? [profile] : [], rowCount: profile ? 1 : 0 };
      }

      if (sql.includes("FROM residents") && sql.includes("WHERE id = $1")) {
        const resident = residents.get(params[0]);
        return { rows: resident ? [resident] : [], rowCount: resident ? 1 : 0 };
      }

      if (sql.includes("UPDATE residents") && sql.includes("archived_at = now()")) {
        const resident = residents.get(params[0]);
        if (!resident) {
          return { rows: [], rowCount: 0 };
        }

        resident.archived_at = "2026-05-26T01:00:00.000Z";
        resident.archived_by_profile_id = params[1];
        resident.updated_at = "2026-05-26T01:00:00.000Z";
        return { rows: [resident], rowCount: 1 };
      }

      if (sql.includes("UPDATE residents") && sql.includes("archived_at = NULL")) {
        const resident = residents.get(params[0]);
        if (!resident) {
          return { rows: [], rowCount: 0 };
        }

        resident.archived_at = null;
        resident.archived_by_profile_id = null;
        resident.updated_at = "2026-05-26T02:00:00.000Z";
        return { rows: [resident], rowCount: 1 };
      }

      if (sql.includes("UPDATE residents")) {
        const resident = residents.get(params[10]);
        if (!resident) {
          return { rows: [], rowCount: 0 };
        }

        Object.assign(resident, {
          full_name: params[0],
          address: params[1],
          exact_address: params[2],
          precinct_number: params[3],
          registered_voter: Boolean(params[3]),
          birth_date: params[4],
          civil_status: params[5],
          occupation: params[6],
          contact_number: params[7],
          sitio: params[8],
          additional_information: params[9],
          updated_at: "2026-05-26T03:00:00.000Z"
        });

        return { rows: [resident], rowCount: 1 };
      }

      if (sql.includes("FROM residents")) {
        const term = String(params[0] ?? "").replace(/%/g, "").toLowerCase();
        const rows = [...residents.values()].filter((resident) => {
          const matches =
            !term ||
            [resident.full_name, resident.id, resident.address, resident.exact_address, resident.sitio]
              .filter(Boolean)
              .join(" ")
              .toLowerCase()
              .includes(term);
          const includeArchived = params.includes(true);
          return matches && (includeArchived || !resident.archived_at);
        });

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

beforeEach(() => {
  vi.stubEnv("AUTH_SESSION_SECRET", "test-auth-session-secret");
  vi.stubEnv("CORS_ORIGINS", TRUSTED_ORIGIN);
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("admin resident management", () => {
  it("allows Admin users to search residents without Lupon confidential fields", async () => {
    const pool = createAdminResidentPool();
    const app = createApp(pool);
    const cookie = await loginAs(app, "admin", "admin123");

    const response = await request(app)
      .get("/api/admin/residents?q=alpha")
      .set("Cookie", cookie);

    expect(response.status).toBe(200);
    expect(response.body.residents).toEqual([
      expect.objectContaining({
        id: "RBI-2026-0001",
        fullName: "Test Resident Alpha",
        exactAddress: "House 1, Zone 1",
        sitio: "Sitio One",
        archived: false
      })
    ]);
    expect(JSON.stringify(response.body)).not.toContain("confidential");
    expect(JSON.stringify(response.body)).not.toContain("note_body");
    expect(JSON.stringify(response.body)).not.toContain("noteBody");
    expect(pool.queries.at(-1).sql).not.toContain("lupon_cases");
    expect(pool.queries.at(-1).sql).not.toContain("lupon_case_notes");
  });

  it("allows Admin users to update basic resident fields and writes safe audit metadata", async () => {
    const pool = createAdminResidentPool();
    const app = createApp(pool);
    const cookie = await loginAs(app, "admin", "admin123");

    const response = await request(app)
      .patch("/api/admin/residents/RBI-2026-0001")
      .set("Cookie", cookie)
      .set("Origin", TRUSTED_ORIGIN)
      .send({
        fullName: "Test Resident Updated",
        address: "Nazareth",
        exactAddress: "House 2, Zone 2",
        precinctNumber: "0099B",
        birthDate: "1989-04-15",
        civilStatus: "Single",
        occupation: "Vendor",
        contactNumber: "09998887777",
        sitio: "Sitio Two",
        additionalInformation: "Non-confidential registry tag",
        confidentialSummary: "must not be stored",
        noteBody: "must not be stored"
      });

    expect(response.status, JSON.stringify(response.body)).toBe(200);
    expect(response.body.resident).toMatchObject({
      fullName: "Test Resident Updated",
      exactAddress: "House 2, Zone 2",
      precinctNumber: "0099B",
      registeredVoter: true,
      sitio: "Sitio Two",
      additionalInformation: "Non-confidential registry tag"
    });

    const residentUpdate = pool.queries.find((query) => query.sql.includes("UPDATE residents"));
    expect(JSON.stringify(residentUpdate.params)).not.toContain("must not be stored");

    expect(pool.audits).toEqual([
      expect.objectContaining({
        actorProfileId: "admin-1",
        action: "resident.admin_updated",
        entityType: "resident",
        entityId: "RBI-2026-0001",
        metadata: expect.objectContaining({
          actorRole: "admin",
          changedFields: expect.arrayContaining(["fullName", "exactAddress", "sitio"])
        })
      })
    ]);
    expect(JSON.stringify(pool.audits)).not.toContain("must not be stored");
    expect(JSON.stringify(pool.audits)).not.toContain("Test Resident Updated");
  });

  it("allows Admin users to archive and restore residents without hard delete", async () => {
    const pool = createAdminResidentPool();
    const app = createApp(pool);
    const cookie = await loginAs(app, "admin", "admin123");

    const archiveResponse = await request(app)
      .post("/api/admin/residents/RBI-2026-0001/archive")
      .set("Cookie", cookie)
      .set("Origin", TRUSTED_ORIGIN);

    expect(archiveResponse.status).toBe(200);
    expect(archiveResponse.body.resident.archived).toBe(true);

    const restoreResponse = await request(app)
      .post("/api/admin/residents/RBI-2026-0001/restore")
      .set("Cookie", cookie)
      .set("Origin", TRUSTED_ORIGIN);

    expect(restoreResponse.status).toBe(200);
    expect(restoreResponse.body.resident.archived).toBe(false);
    expect(pool.queries.some((query) => /\bDELETE\b/i.test(query.sql))).toBe(false);
    expect(pool.audits.map((audit) => audit.action)).toEqual([
      "resident.admin_archived",
      "resident.admin_restored"
    ]);
  });

  it("blocks Department and Lupon users from Admin resident mutation routes", async () => {
    for (const [username, password] of [
      ["department", "dept123"],
      ["lupon", "lupon123"]
    ]) {
      const pool = createAdminResidentPool();
      const app = createApp(pool);
      const cookie = await loginAs(app, username, password);

      const response = await request(app)
        .patch("/api/admin/residents/RBI-2026-0001")
        .set("Cookie", cookie)
        .set("Origin", TRUSTED_ORIGIN)
        .send({ fullName: "Blocked Update" });

      expect(response.status).toBe(403);
      expect(pool.queries.some((query) => query.sql.includes("UPDATE residents"))).toBe(false);
    }
  });
});
