import { Router } from "express";
import { prisma } from "../lib/prisma";

export const healthRouter = Router();

healthRouter.get("/health", async (_req, res) => {
  await prisma.$queryRaw`SELECT 1`;

  res.json({
    ok: true,
    service: "diprochil-api",
    db: "ok",
    timestamp: new Date().toISOString(),
  });
});
