import type { Request, Response } from "express";
import {
  createUserSchema,
  listUsersQuerySchema,
  updateUserSchema,
  changePasswordSchema,
} from "./users.schemas";
import { createUser, listUsers, updateUser, changePassword } from "./users.service";

export async function handleCreateUser(req: Request, res: Response) {
  const parsed = createUserSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ ok: false, message: "Invalid body", issues: parsed.error.issues });
  }

  const b = parsed.data;
  const input = {
    nombre: b.nombre,
    email: b.email,
    password: b.password,
    role: b.role,
    ...(b.active !== undefined ? { active: b.active } : {}),
  };

  try {
    const user = await createUser(input);
    return res.status(201).json({ ok: true, item: user });
  } catch (err: any) {
    if (err?.code === "P2002") {
      return res.status(409).json({ ok: false, message: "Email already exists" });
    }
    throw err;
  }
}

export async function handleListUsers(req: Request, res: Response) {
  const parsed = listUsersQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    return res.status(400).json({ ok: false, message: "Invalid query", issues: parsed.error.issues });
  }

  const q = parsed.data;

  const params = {
    take: q.take,
    skip: q.skip,
    ...(q.search !== undefined ? { search: q.search } : {}),
    ...(q.role !== undefined ? { role: q.role } : {}),
    ...(q.active !== undefined ? { active: q.active } : {}),
  };

  const data = await listUsers(params);
  return res.json({ ok: true, ...data });
}

export async function handleUpdateUser(req: Request, res: Response) {
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) return res.status(400).json({ ok: false, message: "Invalid id" });

  const parsed = updateUserSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ ok: false, message: "Invalid body", issues: parsed.error.issues });
  }

  const b = parsed.data;
  const input = {
    ...(b.nombre !== undefined ? { nombre: b.nombre } : {}),
    ...(b.role !== undefined ? { role: b.role } : {}),
    ...(b.active !== undefined ? { active: b.active } : {}),
  };

  const item = await updateUser(id, input);
  return res.json({ ok: true, item });
}

export async function handleChangePassword(req: Request, res: Response) {
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) return res.status(400).json({ ok: false, message: "Invalid id" });

  const parsed = changePasswordSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ ok: false, message: "Invalid body", issues: parsed.error.issues });
  }

  const item = await changePassword(id, parsed.data.password);
  return res.json({ ok: true, item });
}
