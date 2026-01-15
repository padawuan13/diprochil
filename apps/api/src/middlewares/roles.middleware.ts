import type { NextFunction, Request, Response } from "express";

export function requireRoles(...roles: string[]) {
  const allowed = roles.map((r) => r.trim().toUpperCase());

  return (req: Request, res: Response, next: NextFunction) => {
    const user = req.user;
    const got = String(user?.role ?? "").trim().toUpperCase();

    if (!got) {
      return res.status(401).json({ ok: false, message: "Not authenticated" });
    }

    if (!allowed.includes(got)) {
      return res.status(403).json({
        ok: false,
        message: "Forbidden",
        gotRole: got,
        allowedRoles: allowed,
      });
    }

    next();
  };
}
