import { Router } from "express";
import { toProfile } from "../lib/rows.js";
import { requireRole } from "../middleware/roles.js";

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
          created_at,
          updated_at
        FROM profiles
        ORDER BY created_at ASC, username ASC`
      );

      return res.json({ profiles: result.rows.map(toProfile) });
    } catch (error) {
      return next(error);
    }
  });

  return router;
}
