import type { Request, Response } from "express";
import { createPedidoSchema, listPedidosQuerySchema, updatePedidoSchema } from "./pedidos.schemas";
import { createPedido, deletePedido, listPedidos, updatePedido } from "./pedidos.service";

export async function handleListPedidos(req: Request, res: Response) {
  const parsed = listPedidosQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    return res.status(400).json({ ok: false, message: "Invalid query", issues: parsed.error.issues });
  }

  const q = parsed.data;
  const params = {
    take: q.take,
    skip: q.skip,
    ...(q.estado !== undefined ? { estado: q.estado } : {}),
    ...(q.clientId !== undefined ? { clientId: q.clientId } : {}),
    ...(q.search !== undefined ? { search: q.search } : {}),
    ...(q.unassigned !== undefined ? { unassigned: q.unassigned } : {}),
  };

  const data = await listPedidos(params);
  return res.json({ ok: true, ...data });
}

export async function handleCreatePedido(req: Request, res: Response) {
  const parsed = createPedidoSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ ok: false, message: "Invalid body", issues: parsed.error.issues });
  }

  const b = parsed.data;
  const input = {
    clientId: b.clientId,
    cajas: b.cajas,
    ...(b.fechaCompromiso !== undefined ? { fechaCompromiso: b.fechaCompromiso } : {}),
    ...(b.comentarios !== undefined ? { comentarios: b.comentarios } : {}),
  };

  try {
    const created = await createPedido(input);
    return res.status(201).json({ ok: true, item: created });
  } catch (err: any) {
    if (err?.status === 404) return res.status(404).json({ ok: false, message: err.message });
    throw err;
  }
}

export async function handleUpdatePedido(req: Request, res: Response) {
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) return res.status(400).json({ ok: false, message: "Invalid id" });

  const parsed = updatePedidoSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ ok: false, message: "Invalid body", issues: parsed.error.issues });
  }

  const b = parsed.data;
  const input = {
    ...(b.cajas !== undefined ? { cajas: b.cajas } : {}),
    ...(b.estado !== undefined ? { estado: b.estado } : {}),
    ...(b.fechaCompromiso !== undefined ? { fechaCompromiso: b.fechaCompromiso } : {}),
    ...(b.comentarios !== undefined ? { comentarios: b.comentarios } : {}),
  };

  try {
    const updated = await updatePedido(id, input);
    return res.json({ ok: true, item: updated });
  } catch (err: any) {
    if (err?.code === "P2025") return res.status(404).json({ ok: false, message: "Pedido not found" });
    throw err;
  }
}

export async function handleDeletePedido(req: Request, res: Response) {
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) return res.status(400).json({ ok: false, message: "Invalid id" });

  try {
    const deleted = await deletePedido(id);
    return res.json({ ok: true, item: deleted });
  } catch (err: any) {
    // Prisma: registro no existe
    if (err?.code === "P2025") return res.status(404).json({ ok: false, message: "Pedido not found" });
    // Restricciones de negocio
    if (err?.status === 409) return res.status(409).json({ ok: false, message: err.message });
    throw err;
  }
}