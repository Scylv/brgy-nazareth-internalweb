import { describe, expect, it } from "vitest";
import { canAddRecord, canEditRecord, canManageUsers } from "./permissions";

describe("canEditRecord", () => {
  it("allows Lupon staff to edit", () => {
    expect(canEditRecord("lupon")).toBe(true);
  });

  it("blocks Department Office and Admin from editing resident records", () => {
    expect(canEditRecord("department")).toBe(false);
    expect(canEditRecord("admin")).toBe(false);
  });

  it("blocks missing or unexpected roles from editing", () => {
    expect(canEditRecord()).toBe(false);
    expect(canEditRecord("Lupon")).toBe(false);
  });
});

describe("canAddRecord", () => {
  it("allows only Lupon staff to add resident records", () => {
    expect(canAddRecord("lupon")).toBe(true);
    expect(canAddRecord("department")).toBe(false);
    expect(canAddRecord("admin")).toBe(false);
  });

  it("blocks missing or unexpected roles from adding", () => {
    expect(canAddRecord()).toBe(false);
    expect(canAddRecord("Lupon")).toBe(false);
  });
});

describe("canManageUsers", () => {
  it("allows only admin users to manage accounts", () => {
    expect(canManageUsers("admin")).toBe(true);
    expect(canManageUsers("lupon")).toBe(false);
    expect(canManageUsers("department")).toBe(false);
  });
});
