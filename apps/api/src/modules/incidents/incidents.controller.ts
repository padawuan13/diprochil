import type { Request, Response } from "express";
import { createIncidentSchema, listIncidentsQuerySchema, updateIncidentSchema, reviewIncidentSchema } from "./incidents.schemas";
import { createIncident, listIncidents, updateIncident, reviewIncident, countPendingIncidents, getIncidentById } from "./incidents.service";

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
    ...(q.createdById !== undefined ? { createdById: q.createdById } : {}),
    ...(q.estado !== undefined ? { estado: q.estado } : {}),
  };

  const data = await listIncidents(params);
  return res.json({ ok: true, ...data });
}

/**
 * Obtener contador de incidencias pendientes (para notificaciones)
 */
export async function handleCountPending(_req: Request, res: Response) {
  const count = await countPendingIncidents();
  return res.json({ ok: true, count });
}

/**
 * Obtener una incidencia por ID
 */
export async function handleGetIncident(req: Request, res: Response) {
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) return res.status(400).json({ ok: false, message: "Invalid id" });

  try {
    const incident = await getIncidentById(id);
    return res.json({ ok: true, item: incident });
  } catch (err: any) {
    if (err?.status) return res.status(err.status).json({ ok: false, message: err.message });
    throw err;
  }
}

export async function handleCreateIncident(req: Request, res: Response) {
  const parsed = createIncidentSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ ok: false, message: "Invalid body", issues: parsed.error.issues });
  }

  const user = req.user;

  const b = parsed.data;
  const input = {
    routeId: b.routeId,
    ...(b.pedidoId !== undefined ? { pedidoId: b.pedidoId } : {}),
    ...(user?.id !== undefined ? { createdById: user.id } : {}),
    tipo: b.tipo,
    descripcion: b.descripcion,
  };

  try {
    const created = await createIncident(input);
    return res.status(201).json({ ok: true, item: created });
  } catch (err: any) {
    if (err?.status) return res.status(err.status).json({ ok: false, message: err.message });
    throw err;
  }
}

/**
 * Tomar incidencia en revisión o cerrarla (supervisor/admin)
 */
export async function handleReviewIncident(req: Request, res: Response) {
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) return res.status(400).json({ ok: false, message: "Invalid id" });

  const parsed = reviewIncidentSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ ok: false, message: "Invalid body", issues: parsed.error.issues });
  }

  const user = req.user;
  if (!user) {
    return res.status(401).json({ ok: false, message: "Unauthorized" });
  }

  // Solo ADMIN, PLANIFICADOR y SUPERVISOR pueden revisar incidencias
  if (!["ADMIN", "PLANIFICADOR", "SUPERVISOR"].includes(user.role)) {
    return res.status(403).json({ ok: false, message: "Solo ADMIN, PLANIFICADOR o SUPERVISOR pueden revisar incidencias" });
  }

  try {
    const input = {
      estado: parsed.data.estado,
      ...(parsed.data.comentarioResolucion ? { comentarioResolucion: parsed.data.comentarioResolucion } : {}),
    };
    const updated = await reviewIncident(id, user.id, input);
    return res.json({ ok: true, item: updated });
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
    ...(b.estado !== undefined ? { estado: b.estado } : {}),
    ...(b.comentarioResolucion !== undefined ? { comentarioResolucion: b.comentarioResolucion } : {}),
  };

  try {
    const updated = await updateIncident(id, input);
    return res.json({ ok: true, item: updated });
  } catch (err: any) {
    if (err?.status) return res.status(err.status).json({ ok: false, message: err.message });
    throw err;
  }
}
