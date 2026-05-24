export function requireRole(...allowedRoles) {
  return (req, res, next) => {
    const role = req.user?.role;

    if (!role) {
      return res.status(401).json({ error: "Authentication is required." });
    }

    if (!allowedRoles.includes(role)) {
      return res.status(403).json({ error: "This role is not allowed to access this route." });
    }

    return next();
  };
}
