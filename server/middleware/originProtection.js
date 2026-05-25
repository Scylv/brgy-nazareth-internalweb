const MUTATING_METHODS = new Set(["POST", "PATCH", "PUT", "DELETE"]);

function parseOrigin(value) {
  if (!value) {
    return "";
  }

  try {
    return new URL(value).origin;
  } catch (_error) {
    return "";
  }
}

function getForwardedProto(req) {
  return String(req.get("x-forwarded-proto") ?? "")
    .split(",")[0]
    .trim();
}

function getRequestOrigin(req) {
  const host = req.get("host");

  if (!host) {
    return "";
  }

  const proto = getForwardedProto(req) || req.protocol || "http";

  return `${proto}://${host}`;
}

function getSubmittedOrigin(req) {
  const origin = parseOrigin(req.get("origin"));

  if (origin) {
    return origin;
  }

  return parseOrigin(req.get("referer"));
}

export function createOriginProtectionMiddleware(allowedOrigins) {
  return (req, res, next) => {
    if (!MUTATING_METHODS.has(req.method)) {
      return next();
    }

    const trustedOrigins = new Set([
      ...allowedOrigins,
      getRequestOrigin(req)
    ].filter(Boolean));
    const submittedOrigin = getSubmittedOrigin(req);

    if (!submittedOrigin || !trustedOrigins.has(submittedOrigin)) {
      return res.status(403).json({
        error: "Mutating requests must come from a trusted origin."
      });
    }

    return next();
  };
}
