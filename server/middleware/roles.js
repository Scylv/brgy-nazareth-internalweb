const ROLES = new Set(["admin", "department", "lupon"]);

export function getRoleFromRequest(req) {
  const role = req.header("x-user-role");
  return ROLES.has(role) ? role : null;
}

export function requireRole(...allowedRoles) {
  return (req, res, next) => {
    const role = getRoleFromRequest(req);

    if (!role) {
      return res.status(401).json({ error: "A valid x-user-role header is required." });
    }

    if (!allowedRoles.includes(role)) {
      return res.status(403).json({ error: "This role is not allowed to access this route." });
    }

    req.user = {
      role,
      profileId: req.header("x-profile-id") ?? null
    };

    return next();
  };
}
