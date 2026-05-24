import { getAuthSessionSecret } from "../config/env.js";
import { SESSION_TTL_SECONDS, verifySessionToken } from "../lib/sessionTokens.js";

export const SESSION_COOKIE_NAME = "barangay_session";

function parseCookies(cookieHeader) {
  return String(cookieHeader ?? "")
    .split(";")
    .map((cookie) => cookie.trim())
    .filter(Boolean)
    .reduce((cookies, cookie) => {
      const separatorIndex = cookie.indexOf("=");

      if (separatorIndex <= 0) {
        return cookies;
      }

      const name = cookie.slice(0, separatorIndex);
      const value = cookie.slice(separatorIndex + 1);

      try {
        return {
          ...cookies,
          [name]: decodeURIComponent(value)
        };
      } catch (_error) {
        return cookies;
      }
    }, {});
}

function getSessionCookie(req) {
  return parseCookies(req.headers.cookie)[SESSION_COOKIE_NAME] ?? null;
}

function getCookieAttributes(maxAge) {
  const attributes = [
    "HttpOnly",
    "Path=/",
    "SameSite=Lax",
    `Max-Age=${maxAge}`
  ];

  if (process.env.NODE_ENV === "production") {
    attributes.push("Secure");
  }

  return attributes.join("; ");
}

export function toPublicUser(user) {
  return {
    id: user.id,
    username: user.username,
    name: user.name ?? user.display_name,
    role: user.role
  };
}

export function setSessionCookie(res, token) {
  res.setHeader(
    "Set-Cookie",
    `${SESSION_COOKIE_NAME}=${encodeURIComponent(token)}; ${getCookieAttributes(SESSION_TTL_SECONDS)}`
  );
}

export function clearSessionCookie(res) {
  res.setHeader(
    "Set-Cookie",
    `${SESSION_COOKIE_NAME}=; ${getCookieAttributes(0)}`
  );
}

export function createAuthMiddleware(pool) {
  return async (req, res, next) => {
    const token = getSessionCookie(req);

    if (!token) {
      return res.status(401).json({ error: "Authentication is required." });
    }

    const session = verifySessionToken(token, {
      secret: getAuthSessionSecret()
    });

    if (!session) {
      return res.status(401).json({ error: "Authentication is required." });
    }

    try {
      const result = await pool.query(
        `SELECT
          id,
          username,
          display_name,
          role,
          status
        FROM profiles
        WHERE id = $1
          AND status = 'active'`,
        [session.profileId]
      );

      if (result.rowCount === 0) {
        return res.status(401).json({ error: "Authentication is required." });
      }

      const profile = result.rows[0];

      req.user = {
        id: profile.id,
        profileId: profile.id,
        username: profile.username,
        name: profile.display_name,
        role: profile.role
      };

      return next();
    } catch (error) {
      return next(error);
    }
  };
}
