import request from "supertest";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createApp } from "./app.js";

const TRUSTED_ORIGIN = "https://barangay-staff.example.test";

const profileSeeds = {
  admin: {
    id: "admin-1",
    username: "admin",
    display_name: "Ricardo Morales",
    role: "admin",
    status: "active",
    password_hash:
      "scrypt$admin-seed-salt$8fd8c3981c564ec9a792e99f26a580fdd1485204853c59650cea36193b8f1588e338726df3e6721fbe011617bbfe06714df135942371be109c1d8779e780a842",
    created_at: "2026-05-01T00:00:00.000Z",
    updated_at: "2026-05-01T00:00:00.000Z"
  },
  department: {
    id: "dept-1",
    username: "department",
    display_name: "Elena Ledesma",
    role: "department",
    status: "active",
    password_hash:
      "scrypt$department-seed-salt$d5910b629e20aa4ba66f9a07256e8acc269f2f4ba713a8b46aab166b8de71ea97fbca318438a72a178c6c572fdb5abf258bb6e2ee136b82df1da1cd8219f562c",
    created_at: "2026-05-01T00:00:00.000Z",
    updated_at: "2026-05-01T00:00:00.000Z"
  },
  lupon: {
    id: "lupon-1",
    username: "lupon",
    display_name: "Juan Santos",
    role: "lupon",
    status: "active",
    password_hash:
      "scrypt$lupon-seed-salt$87a90e262f2aaa5bd1727567f438bfef2148ba4e9f6b8e1bbd70eadd19aae19d8feff17bc39443e2b4ddf4b19ec73547bc77403f81b9d2df4ab3f3dd8cfc240a",
    created_at: "2026-05-01T00:00:00.000Z",
    updated_at: "2026-05-01T00:00:00.000Z"
  }
};

function cloneProfile(profile) {
  return { ...profile };
}

function createAccountPool(seedProfiles = Object.values(profileSeeds)) {
  const queries = [];
  const audits = [];
  const profiles = new Map(seedProfiles.map((profile) => [profile.id, cloneProfile(profile)]));

  function findByUsername(username) {
    return (
      [...profiles.values()].find(
        (profile) => profile.username.toLowerCase() === String(username).toLowerCase()
      ) ?? null
    );
  }

  return {
    audits,
    profiles,
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

      if (sql.includes("INSERT INTO profiles")) {
        const [id, username, displayName, role, passwordHash] = params;

        if (findByUsername(username)) {
          const error = new Error("duplicate key value violates unique constraint");
          error.code = "23505";
          throw error;
        }

        const profile = {
          id,
          username,
          display_name: displayName,
          role,
          password_hash: passwordHash,
          status: "active",
          created_at: "2026-05-25T00:00:00.000Z",
          updated_at: "2026-05-25T00:00:00.000Z"
        };

        profiles.set(id, profile);

        return { rows: [profile], rowCount: 1 };
      }

      if (sql.includes("UPDATE profiles") && sql.includes("SET status")) {
        const [status, id] = params;
        const profile = profiles.get(id);

        if (!profile) {
          return { rows: [], rowCount: 0 };
        }

        profile.status = status;
        profile.updated_at = "2026-05-25T01:00:00.000Z";

        return { rows: [profile], rowCount: 1 };
      }

      if (sql.includes("UPDATE profiles") && sql.includes("password_hash")) {
        const [passwordHash, id] = params;
        const profile = profiles.get(id);

        if (!profile) {
          return { rows: [], rowCount: 0 };
        }

        profile.password_hash = passwordHash;
        profile.updated_at = "2026-05-25T02:00:00.000Z";

        return { rows: [profile], rowCount: 1 };
      }

      if (sql.includes("FROM profiles") && sql.includes("lower(username) = $1")) {
        const profile = findByUsername(params[0]);

        return { rows: profile ? [profile] : [], rowCount: profile ? 1 : 0 };
      }

      if (sql.includes("FROM profiles") && sql.includes("WHERE id = $1")) {
        const profile = profiles.get(params[0]);
        const activeProfile = profile?.status === "active" ? profile : null;

        return { rows: activeProfile ? [activeProfile] : [], rowCount: activeProfile ? 1 : 0 };
      }

      if (sql.includes("FROM profiles") && sql.includes("ORDER BY created_at")) {
        return { rows: [...profiles.values()], rowCount: profiles.size };
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

describe("admin account management", () => {
  it("allows Admin users to create Department, Lupon, and Admin accounts", async () => {
    const pool = createAccountPool();
    const app = createApp(pool);
    const cookie = await loginAs(app, "admin", "admin123");

    for (const role of ["department", "lupon", "admin"]) {
      const response = await request(app)
        .post("/api/admin/profiles")
        .set("Cookie", cookie)
        .set("Origin", TRUSTED_ORIGIN)
        .send({
          username: `${role}-new`,
          displayName: `${role} New`,
          role,
          temporaryPassword: `${role}-temp-123`
        });

      expect(response.status, JSON.stringify(response.body)).toBe(201);
      expect(response.body.profile).toMatchObject({
        username: `${role}-new`,
        displayName: `${role} New`,
        role,
        status: "active"
      });
      expect(JSON.stringify(response.body)).not.toContain("password_hash");
      expect(JSON.stringify(response.body)).not.toContain("scrypt$");
    }
  });

  it("blocks Department users from creating users", async () => {
    const pool = createAccountPool();
    const app = createApp(pool);
    const cookie = await loginAs(app, "department", "dept123");

    const response = await request(app)
      .post("/api/admin/profiles")
      .set("Cookie", cookie)
      .set("Origin", TRUSTED_ORIGIN)
      .send({
        username: "blocked-department",
        displayName: "Blocked Department",
        role: "department",
        temporaryPassword: "temporary-123"
      });

    expect(response.status).toBe(403);
    expect(pool.queries.some((query) => query.sql.includes("INSERT INTO profiles"))).toBe(false);
  });

  it("blocks Lupon users from creating users", async () => {
    const pool = createAccountPool();
    const app = createApp(pool);
    const cookie = await loginAs(app, "lupon", "lupon123");

    const response = await request(app)
      .post("/api/admin/profiles")
      .set("Cookie", cookie)
      .set("Origin", TRUSTED_ORIGIN)
      .send({
        username: "blocked-lupon",
        displayName: "Blocked Lupon",
        role: "lupon",
        temporaryPassword: "temporary-123"
      });

    expect(response.status).toBe(403);
    expect(pool.queries.some((query) => query.sql.includes("INSERT INTO profiles"))).toBe(false);
  });

  it("rejects unauthenticated account creation", async () => {
    const pool = createAccountPool();
    const app = createApp(pool);

    const response = await request(app)
      .post("/api/admin/profiles")
      .set("Origin", TRUSTED_ORIGIN)
      .send({
        username: "anonymous",
        displayName: "Anonymous",
        role: "department",
        temporaryPassword: "temporary-123"
      });

    expect(response.status).toBe(401);
    expect(pool.queries).toHaveLength(0);
  });

  it("rejects duplicate usernames", async () => {
    const pool = createAccountPool();
    const app = createApp(pool);
    const cookie = await loginAs(app, "admin", "admin123");

    const response = await request(app)
      .post("/api/admin/profiles")
      .set("Cookie", cookie)
      .set("Origin", TRUSTED_ORIGIN)
      .send({
        username: "department",
        displayName: "Duplicate Department",
        role: "department",
        temporaryPassword: "temporary-123"
      });

    expect(response.status).toBe(409);
    expect(response.body.error).toContain("already exists");
  });

  it("stores hashed passwords and never returns the hash", async () => {
    const pool = createAccountPool();
    const app = createApp(pool);
    const cookie = await loginAs(app, "admin", "admin123");

    const response = await request(app)
      .post("/api/admin/profiles")
      .set("Cookie", cookie)
      .set("Origin", TRUSTED_ORIGIN)
      .send({
        username: "safe-department",
        displayName: "Safe Department",
        role: "department",
        temporaryPassword: "safe-temp-123"
      });

    expect(response.status).toBe(201);

    const insertedProfile = [...pool.profiles.values()].find(
      (profile) => profile.username === "safe-department"
    );

    expect(insertedProfile.password_hash).toMatch(/^scrypt\$/);
    expect(insertedProfile.password_hash).not.toContain("safe-temp-123");
    expect(JSON.stringify(response.body)).not.toContain(insertedProfile.password_hash);
    expect(JSON.stringify(response.body)).not.toContain("password");
  });

  it("prevents deactivated accounts from logging in and allows reactivation", async () => {
    const pool = createAccountPool();
    const app = createApp(pool);
    const cookie = await loginAs(app, "admin", "admin123");

    const deactivateResponse = await request(app)
      .patch("/api/admin/profiles/dept-1/status")
      .set("Cookie", cookie)
      .set("Origin", TRUSTED_ORIGIN)
      .send({ status: "disabled" });

    expect(deactivateResponse.status).toBe(200);
    expect(deactivateResponse.body.profile.status).toBe("disabled");

    const blockedLogin = await request(app)
      .post("/api/auth/login")
      .set("Origin", TRUSTED_ORIGIN)
      .send({ username: "department", password: "dept123" });

    expect(blockedLogin.status).toBe(401);

    const reactivateResponse = await request(app)
      .patch("/api/admin/profiles/dept-1/status")
      .set("Cookie", cookie)
      .set("Origin", TRUSTED_ORIGIN)
      .send({ status: "active" });

    expect(reactivateResponse.status).toBe(200);
    expect(reactivateResponse.body.profile.status).toBe("active");

    const restoredLogin = await request(app)
      .post("/api/auth/login")
      .set("Origin", TRUSTED_ORIGIN)
      .send({ username: "department", password: "dept123" });

    expect(restoredLogin.status).toBe(200);
  });

  it("resets a user's temporary password", async () => {
    const pool = createAccountPool();
    const app = createApp(pool);
    const cookie = await loginAs(app, "admin", "admin123");

    const resetResponse = await request(app)
      .post("/api/admin/profiles/dept-1/reset-password")
      .set("Cookie", cookie)
      .set("Origin", TRUSTED_ORIGIN)
      .send({ temporaryPassword: "new-temporary-123" });

    expect(resetResponse.status).toBe(200);
    expect(resetResponse.body.profile).toMatchObject({
      id: "dept-1",
      username: "department",
      role: "department"
    });
    expect(JSON.stringify(resetResponse.body)).not.toContain("scrypt$");

    const oldLogin = await request(app)
      .post("/api/auth/login")
      .set("Origin", TRUSTED_ORIGIN)
      .send({ username: "department", password: "dept123" });
    const newLogin = await request(app)
      .post("/api/auth/login")
      .set("Origin", TRUSTED_ORIGIN)
      .send({ username: "department", password: "new-temporary-123" });

    expect(oldLogin.status).toBe(401);
    expect(newLogin.status).toBe(200);
  });

  it("writes audit logs for account mutations", async () => {
    const pool = createAccountPool();
    const app = createApp(pool);
    const cookie = await loginAs(app, "admin", "admin123");

    const createResponse = await request(app)
      .post("/api/admin/profiles")
      .set("Cookie", cookie)
      .set("Origin", TRUSTED_ORIGIN)
      .send({
        username: "audit-department",
        displayName: "Audit Department",
        role: "department",
        temporaryPassword: "temporary-123"
      });

    const createdId = createResponse.body.profile.id;

    await request(app)
      .patch(`/api/admin/profiles/${createdId}/status`)
      .set("Cookie", cookie)
      .set("Origin", TRUSTED_ORIGIN)
      .send({ status: "disabled" });

    await request(app)
      .post(`/api/admin/profiles/${createdId}/reset-password`)
      .set("Cookie", cookie)
      .set("Origin", TRUSTED_ORIGIN)
      .send({ temporaryPassword: "temporary-456" });

    expect(pool.audits.map((audit) => audit.action)).toEqual([
      "profile.created",
      "profile.status_updated",
      "profile.password_reset"
    ]);
    expect(pool.audits).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          actorProfileId: "admin-1",
          entityType: "profile",
          entityId: createdId,
          metadata: expect.objectContaining({
            actorRole: "admin",
            targetRole: "department",
            targetUsername: "audit-department"
          })
        })
      ])
    );
    expect(JSON.stringify(pool.audits)).not.toContain("temporary-123");
    expect(JSON.stringify(pool.audits)).not.toContain("temporary-456");
    expect(JSON.stringify(pool.audits)).not.toContain("scrypt$");
  });

  it("allows authenticated users to change their own password", async () => {
    const pool = createAccountPool();
    const app = createApp(pool);
    const cookie = await loginAs(app, "department", "dept123");

    const changeResponse = await request(app)
      .post("/api/auth/password")
      .set("Cookie", cookie)
      .set("Origin", TRUSTED_ORIGIN)
      .send({
        currentPassword: "dept123",
        newPassword: "changed-dept-123"
      });

    expect(changeResponse.status).toBe(200);
    expect(changeResponse.body).toEqual({ ok: true });

    const oldLogin = await request(app)
      .post("/api/auth/login")
      .set("Origin", TRUSTED_ORIGIN)
      .send({ username: "department", password: "dept123" });
    const newLogin = await request(app)
      .post("/api/auth/login")
      .set("Origin", TRUSTED_ORIGIN)
      .send({ username: "department", password: "changed-dept-123" });

    expect(oldLogin.status).toBe(401);
    expect(newLogin.status).toBe(200);
    expect(pool.audits.at(-1)).toMatchObject({
      actorProfileId: "dept-1",
      action: "profile.password_changed",
      entityType: "profile",
      entityId: "dept-1",
      metadata: {
        actorRole: "department",
        targetUsername: "department",
        targetRole: "department"
      }
    });
    expect(JSON.stringify(pool.audits)).not.toContain("changed-dept-123");
    expect(JSON.stringify(pool.audits)).not.toContain("scrypt$");
  });
});
