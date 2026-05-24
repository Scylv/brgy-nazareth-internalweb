import { describe, expect, it } from "vitest";
import { mapApiProfileToAccount } from "./adminProfilesApi";

describe("adminProfilesApi", () => {
  it("maps API profiles to account rows without leaking password hashes", () => {
    const account = mapApiProfileToAccount({
      id: "dept-1",
      username: "department",
      displayName: "Elena Ledesma",
      role: "department",
      createdAt: "2026-05-03T00:00:00.000Z",
      updatedAt: "2026-05-04T00:00:00.000Z",
      password_hash: "scrypt$should-not-leak"
    });

    expect(account).toEqual({
      id: "dept-1",
      username: "department",
      name: "Elena Ledesma",
      displayName: "Elena Ledesma",
      role: "department",
      createdAt: "2026-05-03T00:00:00.000Z",
      updatedAt: "2026-05-04T00:00:00.000Z"
    });
    expect(account).not.toHaveProperty("password_hash");
  });
});
