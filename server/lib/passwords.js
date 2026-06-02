import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

const PASSWORD_ALGORITHM = "scrypt";
const PASSWORD_KEY_LENGTH = 64;

function isNonEmptyString(value) {
  return typeof value === "string" && value.length > 0;
}

export function hashPassword(password, salt = randomBytes(16).toString("hex")) {
  if (!isNonEmptyString(password)) {
    throw new Error("Password is required.");
  }

  if (!isNonEmptyString(salt)) {
    throw new Error("Password salt is required.");
  }

  const hash = scryptSync(password, salt, PASSWORD_KEY_LENGTH).toString("hex");

  return `${PASSWORD_ALGORITHM}$${salt}$${hash}`;
}

export function verifyPassword(password, storedHash) {
  if (!isNonEmptyString(password) || !isNonEmptyString(storedHash)) {
    return false;
  }

  const parts = storedHash.split("$");

  if (parts.length !== 3) {
    return false;
  }

  const [algorithm, salt, hash] = parts;

  if (algorithm !== PASSWORD_ALGORITHM || !isNonEmptyString(salt) || !isNonEmptyString(hash)) {
    return false;
  }

  try {
    const expected = Buffer.from(hash, "hex");
    const actual = scryptSync(password, salt, expected.length);

    return expected.length > 0 && timingSafeEqual(actual, expected);
  } catch (_error) {
    return false;
  }
}
