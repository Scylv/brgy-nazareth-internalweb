import { createHmac, timingSafeEqual } from "node:crypto";

export const SESSION_TTL_SECONDS = 8 * 60 * 60;

function encodeJson(value) {
  return Buffer.from(JSON.stringify(value)).toString("base64url");
}

function decodeJson(value) {
  return JSON.parse(Buffer.from(value, "base64url").toString("utf8"));
}

function sign(value, secret) {
  return createHmac("sha256", secret).update(value).digest("base64url");
}

function safeEqual(left, right) {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);

  return leftBuffer.length === rightBuffer.length && timingSafeEqual(leftBuffer, rightBuffer);
}

export function createSessionToken({ profileId }, { secret, now = () => Date.now() } = {}) {
  if (!profileId) {
    throw new Error("Session profile ID is required.");
  }

  if (!secret) {
    throw new Error("Session secret is required.");
  }

  const payload = encodeJson({
    sub: profileId,
    exp: Math.floor(now() / 1000) + SESSION_TTL_SECONDS
  });
  const signature = sign(payload, secret);

  return `${payload}.${signature}`;
}

export function verifySessionToken(token, { secret, now = () => Date.now() } = {}) {
  if (typeof token !== "string" || !secret) {
    return null;
  }

  const parts = token.split(".");

  if (parts.length !== 2) {
    return null;
  }

  const [payload, signature] = parts;
  const expectedSignature = sign(payload, secret);

  if (!safeEqual(signature, expectedSignature)) {
    return null;
  }

  try {
    const decoded = decodeJson(payload);
    const expiresAt = Number(decoded.exp);

    if (!decoded.sub || !Number.isFinite(expiresAt)) {
      return null;
    }

    if (expiresAt <= Math.floor(now() / 1000)) {
      return null;
    }

    return {
      profileId: decoded.sub,
      expiresAt
    };
  } catch (_error) {
    return null;
  }
}
