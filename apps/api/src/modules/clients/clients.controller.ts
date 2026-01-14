import type { Request, Response } from "express";
import type { Multer } from "multer";
import { createClientSchema, listClientsQuerySchema, updateClientSchema } from "./clients.schemas";
import { createClient, listClients, updateClient } from "./clients.service";
import { importClientsFromXlsx } from "./clients.import.service";
import { prisma } from "../../lib/prisma";

type RequestWithFile = Request & { file?: Express.Multer.File };

export async function handleListClients(req: Request, res: Response) {
  const parsed = listClientsQuerySchema.safeParse(req.query);

  if (!parsed.success) {
    return res.status(400).json({
      ok: false,
      message: "Invalid query params",
      issues: parsed.error.issues,
    });
  }

  const { take, skip, active, search, comuna, ciudad } = parsed.data;

  const params = {
    take,
    skip,
    ...(active !== undefined ? { active } : {}),
    ...(search !== undefined ? { search } : {}),
    ...(comuna !== undefined ? { comuna } : {}),
    ...(ciudad !== undefined ? { ciudad } : {}),
  };

  const data = await listClients(params);
  return res.json({ ok: true, ...data });
} // ← AGREGUÉ ESTA LLAVE PARA CERRAR handleListClients

export async function handleGetClient(req: Request, res: Response) {
  const id = Number(req.params.id);
  
  if (!Number.isFinite(id)) {
    return res.status(400).json({ ok: false, message: "Invalid id" });
  }

  try {
    const client = await prisma.client.findUnique({
      where: { id }
    });

    if (!client) {
      return res.status(404).json({ ok: false, message: "Client not found" });
    }

    return res.json({ ok: true, item: client });
  } catch (error) {
    throw error;
  }
}

export async function handleCreateClient(req: Request, res: Response) {
  const parsed = createClientSchema.safeParse(req.body);

  if (!parsed.success) {
    return res.status(400).json({
      ok: false,
      message: "Invalid body",
      issues: parsed.error.issues,
    });
  }

  try {
    const b = parsed.data;

    const input = {
      rut: b.rut,
      razonSocial: b.razonSocial,
      comuna: b.comuna,
      ciudad: b.ciudad,
      ...(b.giro !== undefined ? { giro: b.giro } : {}),
      ...(b.telefono !== undefined ? { telefono: b.telefono } : {}),
      ...(b.direccion !== undefined ? { direccion: b.direccion } : {}),
      ...(b.isla !== undefined ? { isla: b.isla } : {}),
      ...(b.active !== undefined ? { active: b.active } : {}),
      ...(b.latitud !== undefined ? { latitud: b.latitud } : {}),  // ← AGREGADO
      ...(b.longitud !== undefined ? { longitud: b.longitud } : {}), // ← AGREGADO
    };

    const created = await createClient(input);
    return res.status(201).json({ ok: true, item: created });
  } catch (err: any) {
    if (err?.code === "P2002") {
      return res.status(409).json({
        ok: false,
        message: "Client already exists (rut must be unique)",
      });
    }
    throw err;
  }
}

export async function handleImportClients(req: Request, res: Response) {
  const file = (req as RequestWithFile).file;

  if (!file) {
    return res
      .status(400)
      .json({ ok: false, message: "Missing file (field name: file)" });
  }

  try {
    const result = await importClientsFromXlsx(Buffer.from(file.buffer));
    return res.status(200).json({ ok: true, result });
  } catch (err: any) {
    // Errores típicos: columnas faltantes, archivo inválido, etc.
    return res.status(400).json({
      ok: false,
      message: err?.message ?? "Failed to import file",
    });
  }
}

export async function handleUpdateClient(req: Request, res: Response) {
  const id = Number(req.params.id);
  
  if (!Number.isFinite(id)) {
    return res.status(400).json({ ok: false, message: "Invalid id" });
  }

  const parsed = updateClientSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ 
      ok: false, 
      message: "Invalid body", 
      issues: parsed.error.issues 
    });
  }

  try {
    const updated = await updateClient(id, parsed.data);
    return res.json({ ok: true, item: updated });
  } catch (error: any) {
    if (error?.code === "P2025") {
      return res.status(404).json({ ok: false, message: "Client not found" });
    }
    if (error?.code === "P2002") {
      return res.status(409).json({ ok: false, message: "RUT already exists" });
    }
    throw error;
  }
}