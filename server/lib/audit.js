import { createId } from "./ids.js";

const SENSITIVE_METADATA_KEYS = new Set([
  "confidential_summary",
  "confidentialsummary",
  "note_body",
  "notebody",
  "password",
  "password_hash",
  "passwordhash",
  "secret",
  "session",
  "sessiontoken",
  "token"
]);

function normalizeKey(key) {
  return String(key).replace(/[^a-zA-Z0-9]/g, "").toLowerCase();
}

function sanitizeMetadataValue(value) {
  if (Array.isArray(value)) {
    return value.map(sanitizeMetadataValue);
  }

  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value)
        .filter(([key]) => !SENSITIVE_METADATA_KEYS.has(normalizeKey(key)))
        .map(([key, entryValue]) => [key, sanitizeMetadataValue(entryValue)])
    );
  }

  return value;
}

function buildAuditMetadata(actor, metadata) {
  return sanitizeMetadataValue({
    actorRole: actor?.role ?? null,
    ...(metadata ?? {})
  });
}

export async function writeAuditLog(
  pool,
  {
    actor,
    action,
    targetType,
    targetId,
    metadata = {}
  }
) {
  await pool.query(
    `INSERT INTO audit_logs (
      id,
      actor_profile_id,
      action,
      entity_type,
      entity_id,
      metadata
    )
    VALUES ($1, $2, $3, $4, $5, $6)`,
    [
      createId("AUD"),
      actor?.profileId ?? actor?.id ?? null,
      action,
      targetType,
      targetId ?? null,
      buildAuditMetadata(actor, metadata)
    ]
  );
}
