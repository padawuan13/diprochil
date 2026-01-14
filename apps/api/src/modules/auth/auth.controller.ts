import type { Request, Response } from "express";
import { loginSchema } from "./auth.schemas";
import { login } from "./auth.service";

export async function handleLogin(req: Request, res: Response) {
  const parsed = loginSchema.safeParse(req.body);

  if (!parsed.success) {
    return res.status(400).json({ ok: false, message: "Invalid body", issues: parsed.error.issues });
  }

  const result = await login(parsed.data.email, parsed.data.password);

  if (!result) {
    return res.status(401).json({ ok: false, message: "Invalid credentials" });
  }

  return res.json({ ok: true, ...result });
}

export async function handleMe(req: any, res: Response) {
  return res.json({ ok: true, user: req.user });
}
