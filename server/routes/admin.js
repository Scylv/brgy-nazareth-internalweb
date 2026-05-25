import { Router } from "express";
import { writeAuditLog } from "../lib/audit.js";
import { createId } from "../lib/ids.js";
import { hashPassword } from "../lib/passwords.js";
import { toAdminProfileResponse } from "../lib/responseMappers.js";
import { requireRole } from "../middleware/roles.js";

const ALLOWED_ACCOUNT_ROLES = new Set(["admin", "department", "lupon"]);
const ALLOWED_ACCOUNT_STATUSES = new Set(["active", "disabled"]);

function normalizeUsername(username) {
  return typeof username === "string" ? username.trim().toLowerCase() : "";
}

function normalizeText(value) {
  return typeof value === "string" ? value.trim() : "";
}

function isValidTemporaryPassword(password) {
  return typeof password === "string" && password.length >= 8;
}

function isDuplicateUsernameError(error) {
  return error?.code === "23505";
}

export function createAdminRouter(pool) {
  const router = Router();

  router.get("/profiles", requireRole("admin"), async (_req, res, next) => {
    try {
      const result = await pool.query(
        `SELECT
          id,
          username,
          display_name,
          role,
          status,
          created_at,
          updated_at
        FROM profiles
        ORDER BY created_at ASC, username ASC`
      );

      return res.json({ profiles: result.rows.map(toAdminProfileResponse) });
    } catch (error) {
      return next(error);
    }
  });

  router.post("/profiles", requireRole("admin"), async (req, res, next) => {
    const username = normalizeUsername(req.body?.username);
    const displayName = normalizeText(req.body?.displayName);
    const role = normalizeText(req.body?.role);
    const temporaryPassword = req.body?.temporaryPassword;

    if (!username || !displayName || !role || !isValidTemporaryPassword(temporaryPassword)) {
      return res.status(400).json({
        error: "Username, display name, role, and a temporary password of at least 8 characters are required."
      });
    }

    if (!ALLOWED_ACCOUNT_ROLES.has(role)) {
      return res.status(400).json({ error: "Invalid account role." });
    }

    try {
      const result = await pool.query(
        `INSERT INTO profiles (
          id,
          username,
          display_name,
          role,
          password_hash,
          status
        )
        VALUES ($1, $2, $3, $4, $5, 'active')
        RETURNING
          id,
          username,
          display_name,
          role,
          status,
          created_at,
          updated_at`,
        [
          createId("PROF"),
          username,
          displayName,
          role,
          hashPassword(temporaryPassword)
        ]
      );
      const profile = result.rows[0];

      await writeAuditLog(pool, {
        actor: req.user,
        action: "profile.created",
        targetType: "profile",
        targetId: profile.id,
        metadata: {
          targetUsername: profile.username,
          targetRole: profile.role,
          targetStatus: profile.status
        }
      });

      return res.status(201).json({ profile: toAdminProfileResponse(profile) });
    } catch (error) {
      if (isDuplicateUsernameError(error)) {
        return res.status(409).json({ error: "An account with this username already exists." });
      }

      return next(error);
    }
  });

  router.patch("/profiles/:id/status", requireRole("admin"), async (req, res, next) => {
    const status = normalizeText(req.body?.status);

    if (!ALLOWED_ACCOUNT_STATUSES.has(status)) {
      return res.status(400).json({ error: "Invalid account status." });
    }

    try {
      const result = await pool.query(
        `UPDATE profiles
        SET status = $1,
          updated_at = now()
        WHERE id = $2
        RETURNING
          id,
          username,
          display_name,
          role,
          status,
          created_at,
          updated_at`,
        [status, req.params.id]
      );

      if (result.rowCount === 0) {
        return res.status(404).json({ error: "Account was not found." });
      }

      const profile = result.rows[0];

      await writeAuditLog(pool, {
        actor: req.user,
        action: "profile.status_updated",
        targetType: "profile",
        targetId: profile.id,
        metadata: {
          targetUsername: profile.username,
          targetRole: profile.role,
          targetStatus: profile.status
        }
      });

      return res.json({ profile: toAdminProfileResponse(profile) });
    } catch (error) {
      return next(error);
    }
  });

  router.post("/profiles/:id/reset-password", requireRole("admin"), async (req, res, next) => {
    const temporaryPassword = req.body?.temporaryPassword;

    if (!isValidTemporaryPassword(temporaryPassword)) {
      return res.status(400).json({
        error: "A temporary password of at least 8 characters is required."
      });
    }

    try {
      const result = await pool.query(
        `UPDATE profiles
        SET password_hash = $1,
          updated_at = now()
        WHERE id = $2
        RETURNING
          id,
          username,
          display_name,
          role,
          status,
          created_at,
          updated_at`,
        [hashPassword(temporaryPassword), req.params.id]
      );

      if (result.rowCount === 0) {
        return res.status(404).json({ error: "Account was not found." });
      }

      const profile = result.rows[0];

      await writeAuditLog(pool, {
        actor: req.user,
        action: "profile.password_reset",
        targetType: "profile",
        targetId: profile.id,
        metadata: {
          targetUsername: profile.username,
          targetRole: profile.role,
          targetStatus: profile.status
        }
      });

      return res.json({ profile: toAdminProfileResponse(profile) });
    } catch (error) {
      return next(error);
    }
  });

  return router;
}
