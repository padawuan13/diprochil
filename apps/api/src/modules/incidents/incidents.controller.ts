import type { Request, Response } from "express";
import { createIncidentSchema, listIncidentsQuerySchema, updateIncidentSchema } from "./incidents.schemas";
import { createIncident, listIncidents, updateIncident } from "./incidents.service";

export async function handleListIncidents(req: Request, res: Response) {
  const parsed = listIncidentsQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    return res.status(400).json({ ok: false, message: "Invalid query", issues: parsed.error.issues });
  }

  const q = parsed.data;
  const params = {
    take: q.take,
    skip: q.skip,
    ...(q.routeId !== undefined ? { routeId: q.routeId } : {}),
    ...(q.pedidoId !== undefined ? { pedidoId: q.pedidoId } : {}),
    ...(q.estado !== undefined ? { estado: q.estado } : {}),
    ...(q.severidad !== undefined ? { severidad: q.severidad } : {}),
  };

  const data = await listIncidents(params);
  return res.json({ ok: true, ...data });
}

export async function handleCreateIncident(req: Request, res: Response) {
  const parsed = createIncidentSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ ok: false, message: "Invalid body", issues: parsed.error.issues });
  }

  const user = (req as any).user as { id: number; role: string; email: string } | undefined;

  const b = parsed.data;
  const input = {
  routeId: b.routeId,
  ...(b.pedidoId !== undefined ? { pedidoId: b.pedidoId } : {}),
  ...(user?.id !== undefined ? { createdById: user.id } : {}),
  tipo: b.tipo,
  descripcion: b.descripcion,
  ...(b.severidad !== undefined ? { severidad: b.severidad } : {}),
};

  try {
    const created = await createIncident(input);
    return res.status(201).json({ ok: true, item: created });
  } catch (err: any) {
    if (err?.status) return res.status(err.status).json({ ok: false, message: err.message });
    throw err;
  }
}

export async function handleUpdateIncident(req: Request, res: Response) {
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) return res.status(400).json({ ok: false, message: "Invalid id" });

  const parsed = updateIncidentSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ ok: false, message: "Invalid body", issues: parsed.error.issues });
  }

  const b = parsed.data;
  const input = {
    ...(b.tipo !== undefined ? { tipo: b.tipo } : {}),
    ...(b.descripcion !== undefined ? { descripcion: b.descripcion } : {}),
    ...(b.severidad !== undefined ? { severidad: b.severidad } : {}),
    ...(b.estado !== undefined ? { estado: b.estado } : {}),
  };

  try {
    const updated = await updateIncident(id, input);
    return res.json({ ok: true, item: updated });
  } catch (err: any) {
    if (err?.status) return res.status(err.status).json({ ok: false, message: err.message });
    throw err;
  }
}
