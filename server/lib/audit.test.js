import { describe, expect, it } from "vitest";
import { writeAuditLog } from "./audit.js";

function createAuditPool() {
  const queries = [];

  return {
    queries,
    async query(sql, params = []) {
      queries.push({ sql, params });

      return {
        rows: [],
        rowCount: 1
      };
    }
  };
}

describe("writeAuditLog", () => {
  it("writes actor, target, and sanitized metadata to audit_logs", async () => {
    const pool = createAuditPool();

    await writeAuditLog(pool, {
      actor: {
        profileId: "lupon-1",
        role: "lupon"
      },
      action: "lupon_case_note.created",
      targetType: "lupon_case_note",
      targetId: "LCN-2026-0004",
      metadata: {
        luponCaseId: "LC-2026-0004",
        noteType: "internal",
        noteBody: "Do not audit this note.",
        confidentialSummary: "Do not audit this summary.",
        password: "do-not-audit",
        sessionToken: "do-not-audit",
        nested: {
          secret: "do-not-audit"
        }
      }
    });

    expect(pool.queries).toHaveLength(1);
    expect(pool.queries[0].sql).toContain("INSERT INTO audit_logs");
    expect(pool.queries[0].params.slice(1, 5)).toEqual([
      "lupon-1",
      "lupon_case_note.created",
      "lupon_case_note",
      "LCN-2026-0004"
    ]);
    expect(pool.queries[0].params[5]).toEqual({
      actorRole: "lupon",
      luponCaseId: "LC-2026-0004",
      noteType: "internal",
      nested: {}
    });
  });
});
