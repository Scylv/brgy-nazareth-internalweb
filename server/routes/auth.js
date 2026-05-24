import { Router } from "express";
import { getAuthSessionSecret } from "../config/env.js";
import {
  clearSessionCookie,
  createAuthMiddleware,
  setSessionCookie,
  toPublicUser
} from "../middleware/auth.js";
import { verifyPassword } from "../lib/passwords.js";
import { createSessionToken } from "../lib/sessionTokens.js";

function normalizeUsername(username) {
  return typeof username === "string" ? username.trim().toLowerCase() : "";
}

function hasPassword(password) {
  return typeof password === "string" && password.length > 0;
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

export function createAuthRouter(pool) {
  const router = Router();
  const requireAuth = createAuthMiddleware(pool);

  router.post("/login", async (req, res, next) => {
    const username = normalizeUsername(req.body?.username);
    const password = req.body?.password;

    if (!username || !hasPassword(password)) {
      return res.status(400).json({ error: "Username and password are required." });
    }

    try {
      const profile = await findProfileByUsername(pool, username);
      const isAllowed =
        profile?.status === "active" && verifyPassword(password, profile.password_hash);

      if (!isAllowed) {
        return res.status(401).json({ error: "Invalid username or password." });
      }

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

  router.post("/logout", (_req, res) => {
    clearSessionCookie(res);
    res.json({ ok: true });
  });

  return router;
}
