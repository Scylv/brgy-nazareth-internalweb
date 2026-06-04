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

function cloneResident(row) {
  return {
    ...row,
    sectors: [...(row.sectors ?? [])]
  };
}

function createAdminResidentPool() {
  const queries = [];
  const audits = [];
  const residents = new Map([[residentSeed.id, cloneResident(residentSeed)]]);
  const auditLogRows = [
    {
      id: "AUD-1",
      actor_profile_id: "lupon-1",
      actor_name: "Juan Santos",
      actor_role: "lupon",
      action: "lupon_case.details_updated",
      entity_type: "lupon_case",
      entity_id: "LC-2026-0001",
      metadata: {
        actorRole: "lupon",
        changedFields: ["confidentialSummary"],
        confidentialSummary: "Sensitive mediation narrative.",
        noteBody: "Private note body.",
        caseTitle: "Boundary dispute",
        storage_path: "resident-documents/RBI-2026-0001/private-note.pdf",
        stored_filename: "private-note.pdf"
      },
      created_at: "2026-05-26T04:00:00.000Z"
    },
    {
      id: "AUD-2",
      actor_profile_id: "admin-1",
      actor_name: "Ricardo Morales",
      actor_role: "admin",
      action: "resident.admin_created",
      entity_type: "resident",
      entity_id: "RBI-2026-0001",
      metadata: {
        actorRole: "admin"
      },
      created_at: "2026-05-26T05:00:00.000Z"
    }
  ];

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

      if (sql.includes("FROM audit_logs") && sql.includes("COUNT(*)")) {
        const rows = filterAuditLogRows(params);
        return { rows: [{ total: String(rows.length) }], rowCount: 1 };
      }

      if (sql.includes("FROM audit_logs")) {
        const rows = filterAuditLogRows(params);
        const limit = params.find((param) => Number(param) === param && param > 0) ?? rows.length;
        const offset = params.at(-1) === 0 || params.at(-1) > 0 ? params.at(-1) : 0;

        return { rows: rows.slice(offset, offset + limit), rowCount: rows.length };
      }

      if (sql.includes("FROM profiles")) {
        const profile = findProfile(params[0]);
        return { rows: profile ? [profile] : [], rowCount: profile ? 1 : 0 };
      }

      if (sql.includes("SELECT id") && sql.includes("FROM residents") && sql.includes("lower(id)")) {
        const id = String(params[0] ?? "").toLowerCase();
        const resident = [...residents.values()].find((item) => item.id.toLowerCase() === id);
        return { rows: resident ? [{ id: resident.id }] : [], rowCount: resident ? 1 : 0 };
      }

      if (sql.includes("FROM residents") && sql.includes("WHERE id = $1")) {
        const resident = residents.get(params[0]);
        return { rows: resident ? [resident] : [], rowCount: resident ? 1 : 0 };
      }

      if (sql.includes("COUNT(*)") && sql.includes("FROM residents")) {
        const rows = filterResidentRows(params);
        return { rows: [{ total: String(rows.length) }], rowCount: 1 };
      }

      if (sql.includes("INSERT INTO residents")) {
        const resident = {
          id: params[0],
          household_id: params[1],
          full_name: params[2],
          birth_date: params[3],
          gender: params[4],
          civil_status: params[5],
          occupation: params[6],
          address: params[7],
          exact_address: params[8],
          contact_number: params[9],
          additional_information: params[10],
          sectors: params[11],
          registered_voter: params[12],
          precinct_number: params[13],
          sitio: params[14],
          status_color: params[15],
          archived_at: null,
          archived_by_profile_id: null,
          created_at: "2026-05-26T05:00:00.000Z",
          updated_at: "2026-05-26T05:00:00.000Z"
        };

        residents.set(resident.id, resident);
        return { rows: [resident], rowCount: 1 };
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
        const rows = filterResidentRows(params);
        const limit = params.find((param) => Number(param) === param && param > 0) ?? rows.length;
        const offset = params.at(-1) === 0 || params.at(-1) > 0 ? params.at(-1) : 0;

        return { rows: rows.slice(offset, offset + limit), rowCount: rows.length };
      }

      return { rows: [], rowCount: 0 };
    }
  };

  function filterResidentRows(params) {
    const term = String(params[0] ?? "").replace(/%/g, "").toLowerCase();
    const status = params.includes("archived") ? "archived" : params.includes("all") ? "all" : "active";

    return [...residents.values()].filter((resident) => {
      const matches =
        !term ||
        [
          resident.full_name,
          resident.id,
          resident.household_id,
          resident.address,
          resident.exact_address,
          resident.sitio,
          resident.precinct_number
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase()
          .includes(term);
      const matchesStatus =
        status === "all" ||
        (status === "archived" ? Boolean(resident.archived_at) : !resident.archived_at);

      return matches && matchesStatus;
    });
  }

  function filterAuditLogRows(params) {
    const textParams = params.filter((param) => typeof param === "string");
    const entityTypeParam = textParams.find((param) =>
      String(param).replace(/%/g, "").includes("_")
    );

    if (!entityTypeParam) {
      return auditLogRows;
    }

    const entityType = entityTypeParam.replace(/%/g, "").toLowerCase();

    return auditLogRows.filter((row) => row.entity_type.toLowerCase().includes(entityType));
  }
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

describe("admin resident management", () => {
  it("allows Admin users to search residents without Lupon confidential fields", async () => {
    const pool = createAdminResidentPool();
    const app = createApp(pool);
    const cookie = await loginAs(app, "admin", "admin123");

    const response = await request(app)
      .get("/api/admin/residents?q=alpha")
      .set("Cookie", cookie);

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      page: 1,
      pageSize: 25,
      total: 1,
      totalPages: 1,
      hasNext: false,
      hasPrevious: false
    });
    expect(response.body.items).toEqual([
      expect.objectContaining({
        id: "RBI-2026-0001",
        fullName: "Test Resident Alpha",
        exactAddress: "House 1, Zone 1",
        sitio: "Sitio One",
        archived: false
      })
    ]);
    expect(response.body.residents).toEqual(response.body.items);
    expect(JSON.stringify(response.body)).not.toContain("confidential");
    expect(JSON.stringify(response.body)).not.toContain("note_body");
    expect(JSON.stringify(response.body)).not.toContain("noteBody");
    expect(pool.queries.at(-1).sql).not.toContain("lupon_cases");
    expect(pool.queries.at(-1).sql).not.toContain("lupon_case_notes");
  });

  it("caps Admin resident page size and searches across address, sitio, precinct, and RBI fields", async () => {
    const pool = createAdminResidentPool();
    const app = createApp(pool);
    const cookie = await loginAs(app, "admin", "admin123");

    pool.residents.set("RBI-2026-0002", {
      ...cloneResident(residentSeed),
      id: "RBI-2026-0002",
      full_name: "Second Resident",
      address: "Lower Balulang",
      exact_address: "Block 7",
      sitio: "Mahogany",
      precinct_number: "7788C"
    });

    const response = await request(app)
      .get("/api/admin/residents?page=1&pageSize=500&search=7788C")
      .set("Cookie", cookie);

    expect(response.status).toBe(200);
    expect(response.body.pageSize).toBe(100);
    expect(response.body.total).toBe(1);
    expect(response.body.items[0]).toMatchObject({
      id: "RBI-2026-0002",
      sitio: "Mahogany",
      precinctNumber: "7788C"
    });
  });

  it("supports showArchived for Admin resident pagination without exposing confidential fields", async () => {
    const pool = createAdminResidentPool();
    const app = createApp(pool);
    const cookie = await loginAs(app, "admin", "admin123");

    pool.residents.set("RBI-2026-0002", {
      ...cloneResident(residentSeed),
      id: "RBI-2026-0002",
      full_name: "Archived Resident",
      archived_at: "2026-05-26T01:00:00.000Z",
      archived_by_profile_id: "admin-1"
    });

    const response = await request(app)
      .get("/api/admin/residents?page=1&pageSize=25&showArchived=true")
      .set("Cookie", cookie);

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      page: 1,
      pageSize: 25,
      total: 2,
      totalPages: 1,
      hasNext: false,
      hasPrevious: false
    });
    expect(response.body.items.map((resident) => resident.id)).toEqual([
      "RBI-2026-0001",
      "RBI-2026-0002"
    ]);
    expect(JSON.stringify(response.body)).not.toContain("Lupon-only");
  });

  it("allows Admin users to create residents and rejects duplicate RBI values", async () => {
    const pool = createAdminResidentPool();
    const app = createApp(pool);
    const cookie = await loginAs(app, "admin", "admin123");

    const createResponse = await request(app)
      .post("/api/admin/residents")
      .set("Cookie", cookie)
      .set("Origin", TRUSTED_ORIGIN)
      .send({
        id: "RBI-2026-0100",
        householdId: "HH-MANUAL-100",
        fullName: "Manual Resident",
        gender: "Female",
        address: "Nazareth",
        exactAddress: "Door 8",
        sitio: "Sitio Manual",
        precinctNumber: "1234A",
        contactNumber: "09170000000",
        birthDate: "1992-02-03",
        civilStatus: "Single",
        sectors: ["Registered Voter"]
      });

    expect(createResponse.status, JSON.stringify(createResponse.body)).toBe(201);
    expect(createResponse.body.resident).toMatchObject({
      id: "RBI-2026-0100",
      householdId: "HH-MANUAL-100",
      fullName: "Manual Resident",
      gender: "Female",
      statusColor: "green"
    });
    expect(pool.audits).toContainEqual(
      expect.objectContaining({
        action: "resident.admin_created",
        entityType: "resident",
        entityId: "RBI-2026-0100"
      })
    );

    const duplicateResponse = await request(app)
      .post("/api/admin/residents")
      .set("Cookie", cookie)
      .set("Origin", TRUSTED_ORIGIN)
      .send({
        id: "RBI-2026-0100",
        householdId: "HH-MANUAL-101",
        fullName: "Duplicate Resident",
        gender: "Male",
        address: "Nazareth"
      });

    expect(duplicateResponse.status).toBe(409);
  });

  it("rejects Admin resident creation when required fields are missing", async () => {
    const pool = createAdminResidentPool();
    const app = createApp(pool);
    const cookie = await loginAs(app, "admin", "admin123");

    const response = await request(app)
      .post("/api/admin/residents")
      .set("Cookie", cookie)
      .set("Origin", TRUSTED_ORIGIN)
      .send({
        householdId: "HH-MISSING",
        fullName: "Missing Resident",
        gender: "Female"
      });

    expect(response.status).toBe(400);
    expect(response.body.error).toBe(
      "Resident ID, household ID, full name, gender, and address are required."
    );
    expect(pool.queries.some((query) => query.sql.includes("INSERT INTO residents"))).toBe(false);
  });

  it("blocks Department and Lupon users from Admin resident creation", async () => {
    for (const [username, password] of [
      ["department", "dept123"],
      ["lupon", "lupon123"]
    ]) {
      const pool = createAdminResidentPool();
      const app = createApp(pool);
      const cookie = await loginAs(app, username, password);

      const response = await request(app)
        .post("/api/admin/residents")
        .set("Cookie", cookie)
        .set("Origin", TRUSTED_ORIGIN)
        .send({
          householdId: "HH-BLOCKED",
          fullName: "Blocked Create",
          gender: "Female",
          address: "Nazareth"
        });

      expect(response.status).toBe(403);
      expect(pool.queries.some((query) => query.sql.includes("INSERT INTO residents"))).toBe(false);
    }
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

  it("returns Admin-only paginated audit logs without confidential Lupon contents", async () => {
    const pool = createAdminResidentPool();
    const app = createApp(pool);
    const adminCookie = await loginAs(app, "admin", "admin123");

    const response = await request(app)
      .get("/api/admin/audit-logs?page=1&pageSize=500&entityType=lupon%20case")
      .set("Cookie", adminCookie);

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      page: 1,
      pageSize: 100,
      total: 1,
      totalPages: 1
    });
    expect(response.body.items[0]).toMatchObject({
      actorName: "Juan Santos",
      role: "lupon",
      action: "lupon_case.details_updated",
      entityType: "lupon_case",
      entityReference: "LC-2026-0001",
      details: "Lupon case updated"
    });
    expect(JSON.stringify(response.body)).not.toContain("Sensitive mediation narrative");
    expect(JSON.stringify(response.body)).not.toContain("Private note body");
    expect(JSON.stringify(response.body)).not.toContain("Boundary dispute");
    expect(JSON.stringify(response.body)).not.toContain("storage_path");
    expect(JSON.stringify(response.body)).not.toContain("stored_filename");
    expect(JSON.stringify(response.body)).not.toContain("private-note.pdf");

    for (const [username, password] of [
      ["department", "dept123"],
      ["lupon", "lupon123"]
    ]) {
      const blockedCookie = await loginAs(app, username, password);
      const blockedResponse = await request(app)
        .get("/api/admin/audit-logs")
        .set("Cookie", blockedCookie);

      expect(blockedResponse.status).toBe(403);
    }
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
