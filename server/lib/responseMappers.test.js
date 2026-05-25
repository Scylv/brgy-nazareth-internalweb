import { describe, expect, it } from "vitest";
import {
  toAdminProfileResponse,
  toDepartmentResidentResponse,
  toLuponCaseNoteResponse,
  toLuponCaseResponse
} from "./responseMappers.js";

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
  confidential_summary: "Do not expose this summary.",
  note_body: "Do not expose this note.",
  created_at: "2026-05-01T00:00:00.000Z",
  updated_at: "2026-05-01T00:00:00.000Z"
};

const profileRow = {
  id: "admin-1",
  username: "admin",
  display_name: "Ricardo Morales",
  role: "admin",
  status: "active",
  password_hash: "scrypt$should-not-leak",
  confidential_summary: "Do not expose this summary.",
  note_body: "Do not expose this note.",
  created_at: "2026-05-01T00:00:00.000Z",
  updated_at: "2026-05-02T00:00:00.000Z"
};

describe("safe API response mappers", () => {
  it("maps Department resident responses without confidential Lupon fields", () => {
    const resident = toDepartmentResidentResponse(residentRow);

    expect(resident).toMatchObject({
      id: "RBI-2024-0002",
      fullName: "Maria Santos",
      statusColor: "yellow"
    });
    expect(JSON.stringify(resident)).not.toContain("confidential");
    expect(JSON.stringify(resident)).not.toContain("note_body");
    expect(resident).not.toHaveProperty("confidentialSummary");
    expect(resident).not.toHaveProperty("noteBody");
    expect(resident).not.toHaveProperty("luponCases");
    expect(resident).not.toHaveProperty("luponCaseNotes");
  });

  it("maps Admin profile responses without password hashes or Lupon fields", () => {
    const profile = toAdminProfileResponse(profileRow);

    expect(profile).toEqual({
      id: "admin-1",
      username: "admin",
      displayName: "Ricardo Morales",
      role: "admin",
      status: "active",
      createdAt: "2026-05-01T00:00:00.000Z",
      updatedAt: "2026-05-02T00:00:00.000Z"
    });
    expect(JSON.stringify(profile)).not.toContain("scrypt$");
    expect(JSON.stringify(profile)).not.toContain("confidential");
    expect(JSON.stringify(profile)).not.toContain("note_body");
  });

  it("maps Lupon case and note responses with confidential fields for Lupon workflows", () => {
    expect(
      toLuponCaseResponse({
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
      })
    ).toMatchObject({
      id: "LC-2026-0001",
      confidentialSummary: "Address mismatch reported during verification."
    });

    expect(
      toLuponCaseNoteResponse({
        id: "LCN-2026-0001",
        lupon_case_id: "LC-2026-0001",
        note_type: "internal",
        note_body: "Pending review by Lupon clerk.",
        created_by_profile_id: "lupon-1",
        created_at: "2026-05-01T01:00:00.000Z"
      })
    ).toMatchObject({
      id: "LCN-2026-0001",
      noteBody: "Pending review by Lupon clerk."
    });
  });

  it("returns null for missing or invalid row input", () => {
    expect(toDepartmentResidentResponse(null)).toBeNull();
    expect(toAdminProfileResponse(undefined)).toBeNull();
    expect(toLuponCaseResponse("not-a-row")).toBeNull();
    expect(toLuponCaseNoteResponse(42)).toBeNull();
  });
});
