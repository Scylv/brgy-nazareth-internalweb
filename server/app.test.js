import request from "supertest";
import { describe, expect, it } from "vitest";
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

describe("role-based API access", () => {
  it("requires a valid role header", async () => {
    const app = createApp(createPool());

    const response = await request(app).get("/api/residents");

    expect(response.status).toBe(401);
    expect(response.body.error).toContain("x-user-role");
  });

  it("blocks Department users from Lupon case routes", async () => {
    const app = createApp(createPool());

    const response = await request(app)
      .get("/api/lupon/cases")
      .set("x-user-role", "department");

    expect(response.status).toBe(403);
  });

  it("does not return Lupon confidential fields to Department resident routes", async () => {
    const pool = createPool([[residentRow]]);
    const app = createApp(pool);

    const response = await request(app)
      .get("/api/residents/RBI-2024-0002")
      .set("x-user-role", "department");

    expect(response.status).toBe(200);
    expect(response.body).not.toHaveProperty("luponCases");
    expect(response.body).not.toHaveProperty("luponCaseNotes");
    expect(JSON.stringify(response.body)).not.toContain("confidentialSummary");
    expect(JSON.stringify(response.body)).not.toContain("noteBody");
    expect(pool.queries).toHaveLength(1);
  });

  it("allows Lupon users to read confidential case context", async () => {
    const pool = createPool([
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

    const response = await request(app)
      .get("/api/residents/RBI-2024-0002")
      .set("x-user-role", "lupon");

    expect(response.status).toBe(200);
    expect(response.body.luponCases[0].confidentialSummary).toContain("Address mismatch");
    expect(response.body.luponCaseNotes[0].noteBody).toContain("Pending review");
  });

  it("rejects invalid document request statuses before writing to the database", async () => {
    const pool = createPool();
    const app = createApp(pool);

    const response = await request(app)
      .post("/api/document-requests")
      .set("x-user-role", "department")
      .send({
        residentId: "RBI-2024-0001",
        barangayDocumentId: "BDOC-001",
        purpose: "Local employment requirement",
        requestDate: "2026-05-18",
        status: "on_hold"
      });

    expect(response.status).toBe(400);
    expect(response.body.error).toContain("Invalid document request status");
    expect(pool.queries).toHaveLength(0);
  });
});
