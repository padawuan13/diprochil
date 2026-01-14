import type { Request, Response } from "express";
import {
  createVehicleSchema,
  listVehiclesQuerySchema,
  updateVehicleSchema,
} from "./vehicles.schemas";
import { createVehicle, listVehicles, updateVehicle } from "./vehicles.service";

export async function handleListVehicles(req: Request, res: Response) {
  const parsed = listVehiclesQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    return res.status(400).json({ ok: false, message: "Invalid query", issues: parsed.error.issues });
  }

  const q = parsed.data;
  const params = {
    take: q.take,
    skip: q.skip,
    ...(q.search !== undefined ? { search: q.search } : {}),
    ...(q.estado !== undefined ? { estado: q.estado } : {}),
    ...(q.activeOnly !== undefined ? { activeOnly: q.activeOnly } : {}),
  };

  const data = await listVehicles(params);
  return res.json({ ok: true, ...data });
}

export async function handleCreateVehicle(req: Request, res: Response) {
  const parsed = createVehicleSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ ok: false, message: "Invalid body", issues: parsed.error.issues });
  }

  try {
    const body = parsed.data;
const input = {
  patente: body.patente,
  ...(body.capacidadKg !== undefined ? { capacidadKg: body.capacidadKg } : {}),
  ...(body.tipo !== undefined ? { tipo: body.tipo } : {}),
  ...(body.estado !== undefined ? { estado: body.estado } : {}),
  ...(body.observaciones !== undefined ? { observaciones: body.observaciones } : {}),
};
const created = await createVehicle(input);

    return res.status(201).json({ ok: true, item: created });
  } catch (err: any) {
    if (err?.code === "P2002") {
      return res.status(409).json({ ok: false, message: "Vehicle already exists (patente must be unique)" });
    }
    throw err;
  }
}

export async function handleUpdateVehicle(req: Request, res: Response) {
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) return res.status(400).json({ ok: false, message: "Invalid id" });

  const parsed = updateVehicleSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ ok: false, message: "Invalid body", issues: parsed.error.issues });
  }

  try {
    const body = parsed.data;
const input = {
  ...(body.patente !== undefined ? { patente: body.patente } : {}),
  ...(body.capacidadKg !== undefined ? { capacidadKg: body.capacidadKg } : {}),
  ...(body.tipo !== undefined ? { tipo: body.tipo } : {}),
  ...(body.estado !== undefined ? { estado: body.estado } : {}),
  ...(body.observaciones !== undefined ? { observaciones: body.observaciones } : {}),
};
const updated = await updateVehicle(id, input);

    return res.json({ ok: true, item: updated });
  } catch (err: any) {
    if (err?.code === "P2025") {
      return res.status(404).json({ ok: false, message: "Vehicle not found" });
    }
    if (err?.code === "P2002") {
      return res.status(409).json({ ok: false, message: "Patente already exists" });
    }
    throw err;
  }
}
