import express from "express";
import { createDocumentRequestsRouter } from "./routes/documentRequests.js";
import { createLuponCasesRouter } from "./routes/luponCases.js";
import { createResidentsRouter } from "./routes/residents.js";

export function createApp(pool) {
  const app = express();

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
