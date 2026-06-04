import { Router } from "express";
import { getAuthSessionSecret } from "../config/env.js";
import {
  clearSessionCookie,
  createAuthMiddleware,
  setSessionCookie,
  toPublicUser
} from "../middleware/auth.js";
import { writeAuditLog } from "../lib/audit.js";
import { hashPassword, verifyPassword } from "../lib/passwords.js";
import { createSessionToken } from "../lib/sessionTokens.js";

const LOGIN_RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000;
const LOGIN_RATE_LIMIT_MAX_ATTEMPTS = 5;

function normalizeUsername(username) {
  return typeof username === "string" ? username.trim().toLowerCase() : "";
}

function hasPassword(password) {
  return typeof password === "string" && password.length > 0;
}

function isValidNewPassword(password) {
  return typeof password === "string" && password.length >= 8;
}

async function findProfileByUsername(pool, username) {
  const result = await pool.query(
    `SELECT
      id,
      username,
      display_name,
      role,
      status,
      password_hash
    FROM profiles
    WHERE lower(username) = $1
    LIMIT 1`,
    [username]
  );

  return result.rows[0] ?? null;
}

function createLoginRateLimiter() {
  const attempts = new Map();

  function getKey(req, username) {
    return `${req.ip ?? req.socket?.remoteAddress ?? "unknown"}:${username}`;
  }

  function getAttempt(key, now) {
    const attempt = attempts.get(key);

    if (!attempt || attempt.expiresAt <= now) {
      return {
        count: 0,
        expiresAt: now + LOGIN_RATE_LIMIT_WINDOW_MS
      };
    }

    return attempt;
  }

  return {
    isLimited(req, username, now = Date.now()) {
      const attempt = getAttempt(getKey(req, username), now);

      return attempt.count >= LOGIN_RATE_LIMIT_MAX_ATTEMPTS;
    },
    recordFailure(req, username, now = Date.now()) {
      const key = getKey(req, username);
      const attempt = getAttempt(key, now);

      attempts.set(key, {
        count: attempt.count + 1,
        expiresAt: attempt.expiresAt
      });
    },
    clear(req, username) {
      attempts.delete(getKey(req, username));
    }
  };
}

export function createAuthRouter(pool, { requireTrustedOrigin } = {}) {
  const router = Router();
  const requireAuth = createAuthMiddleware(pool);
  const loginRateLimiter = createLoginRateLimiter();
  const trustedOriginMiddleware = requireTrustedOrigin ? [requireTrustedOrigin] : [];

  router.post("/login", trustedOriginMiddleware, async (req, res, next) => {
    const username = normalizeUsername(req.body?.username);
    const password = req.body?.password;

    if (!username || !hasPassword(password)) {
      return res.status(400).json({ error: "Username and password are required." });
    }

    if (loginRateLimiter.isLimited(req, username)) {
      return res.status(429).json({
        error: "Too many login attempts. Try again later."
      });
    }

    try {
      const profile = await findProfileByUsername(pool, username);
      const isAllowed =
        profile?.status === "active" && verifyPassword(password, profile.password_hash);

      if (!isAllowed) {
        loginRateLimiter.recordFailure(req, username);
        return res.status(401).json({ error: "Invalid username or password." });
      }

      loginRateLimiter.clear(req, username);

      const token = createSessionToken({
        profileId: profile.id
      }, {
        secret: getAuthSessionSecret()
      });

      setSessionCookie(res, token);

      return res.json({ user: toPublicUser(profile) });
    } catch (error) {
      return next(error);
    }
  });

  router.get("/me", requireAuth, (req, res) => {
    res.json({ user: toPublicUser(req.user) });
  });

  const protectedPasswordMiddleware = requireTrustedOrigin
    ? [requireAuth, requireTrustedOrigin]
    : [requireAuth];
  const protectedLogoutMiddleware = requireTrustedOrigin
    ? [requireAuth, requireTrustedOrigin]
    : [requireAuth];

  router.post("/password", protectedPasswordMiddleware, async (req, res, next) => {
    const currentPassword = req.body?.currentPassword;
    const newPassword = req.body?.newPassword;

    if (!hasPassword(currentPassword) || !isValidNewPassword(newPassword)) {
      return res.status(400).json({
        error: "Current password and a new password of at least 8 characters are required."
      });
    }

    try {
      const profileResult = await pool.query(
        `SELECT
          password_hash
        FROM profiles
        WHERE id = $1
          AND status = 'active'
        LIMIT 1`,
        [req.user.profileId]
      );
      const profile = profileResult.rows[0];

      if (!profile || !verifyPassword(currentPassword, profile.password_hash)) {
        return res.status(401).json({ error: "Current password is incorrect." });
      }

      await pool.query(
        `UPDATE profiles
        SET password_hash = $1,
          updated_at = now()
        WHERE id = $2`,
        [hashPassword(newPassword), req.user.profileId]
      );

      await writeAuditLog(pool, {
        actor: req.user,
        action: "profile.password_changed",
        targetType: "profile",
        targetId: req.user.profileId,
        metadata: {
          targetUsername: req.user.username,
          targetRole: req.user.role
        }
      });

      return res.json({ ok: true });
    } catch (error) {
      return next(error);
    }
  });

  router.post("/logout", protectedLogoutMiddleware, (_req, res) => {
    clearSessionCookie(res);
    res.json({ ok: true });
  });

  return router;
}
