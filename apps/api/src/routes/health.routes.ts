import { Router } from "express";
import { prisma } from "../lib/prisma";

export const healthRouter = Router();

healthRouter.get("/health", (_req, res) => {
  res.status(200).json({ ok: true });
});

healthRouter.get("/ready", async (_req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.status(200).json({ ok: true, db: "up" });
  } catch {
    res.status(200).json({ ok: true, db: "down" }); 
  }
});
