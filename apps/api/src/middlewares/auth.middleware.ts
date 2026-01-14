import type { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";

type JwtPayload = {
  sub: string; // userId
  role: string;
  email: string;
};

export function authMiddleware(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization;

  if (!header?.startsWith("Bearer ")) {
    return res.status(401).json({ ok: false, message: "Missing Bearer token" });
  }

  const token = header.slice("Bearer ".length).trim();
  const secret = process.env.JWT_SECRET;

  if (!secret) {
    return res.status(500).json({ ok: false, message: "JWT_SECRET not configured" });
  }

  try {
    const decoded = jwt.verify(token, secret) as JwtPayload;

    req.user = {
      id: Number(decoded.sub),
      role: String(decoded.role ?? "").trim().toUpperCase() as "ADMIN" | "PLANIFICADOR" | "SUPERVISOR" | "CONDUCTOR",
      email: String(decoded.email ?? "").trim().toLowerCase(),
    };

    return next();
  } catch {
    return res.status(401).json({ ok: false, message: "Invalid or expired token" });
  }
}
