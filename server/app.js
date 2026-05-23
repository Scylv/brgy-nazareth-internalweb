import express from "express";
import { getCorsOrigins } from "./config/env.js";
import { createDocumentRequestsRouter } from "./routes/documentRequests.js";
import { createLuponCasesRouter } from "./routes/luponCases.js";
import { createResidentsRouter } from "./routes/residents.js";

export function createApp(pool) {
  const app = express();
  const allowedOrigins = getCorsOrigins();

  app.use((req, res, next) => {
    const origin = req.get("origin");

    if (allowedOrigins.has(origin)) {
      res.setHeader("Access-Control-Allow-Origin", origin);
      res.setHeader("Vary", "Origin");
    }

    res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type,x-user-role,x-profile-id");

    if (req.method === "OPTIONS") {
      return res.sendStatus(204);
    }

    return next();
  });

  app.use(express.json());

  app.get("/api/health", (_req, res) => {
    res.json({ ok: true });
  });

  app.use("/api/residents", createResidentsRouter(pool));
  app.use("/api/document-requests", createDocumentRequestsRouter(pool));
  app.use("/api/lupon", createLuponCasesRouter(pool));

  app.use((error, _req, res, _next) => {
    console.error(error);
    res.status(500).json({ error: "Unexpected server error." });
  });

  return app;
}
