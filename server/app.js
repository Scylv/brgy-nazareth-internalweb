import express from "express";
import { getAuthCookieConfig, getAuthSessionSecret, getCorsOrigins } from "./config/env.js";
import { createAuthMiddleware } from "./middleware/auth.js";
import { createOriginProtectionMiddleware } from "./middleware/originProtection.js";
import { createAdminRouter } from "./routes/admin.js";
import { createAuthRouter } from "./routes/auth.js";
import { createDocumentRequestsRouter } from "./routes/documentRequests.js";
import { createLuponCasesRouter } from "./routes/luponCases.js";
import {
  createResidentDocumentCollectionRouter,
  createResidentDocumentFilesRouter
} from "./routes/residentDocuments.js";
import { createResidentsRouter } from "./routes/residents.js";

const CORS_ALLOWED_HEADERS = [
  "Content-Type",
  "X-File-Name",
  "X-Sheet-Name",
  "X-Header-Row",
  "X-Column-Mapping",
  "X-Sheet-Defaults",
  "X-Import-Mode",
  "X-Import-Confirmed",
  "X-Backup-Confirmed",
  "X-Document-Type",
  "X-Visibility-Scope",
  "X-Linked-Case-Id"
].join(", ");

export function createApp(pool) {
  const app = express();
  const allowedOrigins = getCorsOrigins();

  getAuthSessionSecret();
  getAuthCookieConfig();

  app.use((req, res, next) => {
    const origin = req.get("origin");

    if (allowedOrigins.has(origin)) {
      res.setHeader("Access-Control-Allow-Origin", origin);
      res.setHeader("Access-Control-Allow-Credentials", "true");
      res.setHeader("Vary", "Origin");
    }

    res.setHeader("Access-Control-Allow-Methods", "GET,POST,PATCH,PUT,DELETE,OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", CORS_ALLOWED_HEADERS);

    if (req.method === "OPTIONS") {
      return res.sendStatus(204);
    }

    return next();
  });

  app.use(express.json());

  app.get("/api/health", (_req, res) => {
    res.json({ ok: true });
  });

  const requireAuth = createAuthMiddleware(pool);
  const requireTrustedOrigin = createOriginProtectionMiddleware(allowedOrigins);

  app.use("/api/auth", createAuthRouter(pool, { requireTrustedOrigin }));
  app.use("/api/admin", requireAuth, requireTrustedOrigin, createAdminRouter(pool));
  app.use(
    "/api/residents/:residentId/documents",
    requireAuth,
    requireTrustedOrigin,
    createResidentDocumentCollectionRouter(pool)
  );
  app.use("/api/residents", requireAuth, requireTrustedOrigin, createResidentsRouter(pool));
  app.use(
    "/api/resident-documents/:documentId",
    requireAuth,
    requireTrustedOrigin,
    createResidentDocumentFilesRouter(pool)
  );
  app.use(
    "/api/document-requests",
    requireAuth,
    requireTrustedOrigin,
    createDocumentRequestsRouter(pool)
  );
  app.use("/api/lupon", requireAuth, requireTrustedOrigin, createLuponCasesRouter(pool));

  app.use((error, _req, res, _next) => {
    if (error?.type === "entity.too.large") {
      return res.status(413).json({ error: "Document file is too large." });
    }

    console.error(error);
    return res.status(500).json({ error: "Unexpected server error." });
  });

  return app;
}
