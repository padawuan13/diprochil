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
      message: "Parametros de consulta invalidos",
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
} 

export async function handleGetClient(req: Request, res: Response) {
  const id = Number(req.params.id);
  
  if (!Number.isFinite(id)) {
    return res.status(400).json({ ok: false, message: "ID invalido" });
  }

  try {
    const client = await prisma.client.findUnique({
      where: { id }
    });

    if (!client) {
      return res.status(404).json({ ok: false, message: "Cliente no encontrado" });
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
      message: "Datos invalidos",
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
      ...(b.latitud !== undefined ? { latitud: b.latitud } : {}),
      ...(b.longitud !== undefined ? { longitud: b.longitud } : {}),
    };

    const created = await createClient(input);
    return res.status(201).json({ ok: true, item: created });
  } catch (err: any) {
    if (err?.code === "P2002") {
      return res.status(409).json({
        ok: false,
        message: "El cliente ya existe (el RUT debe ser unico)",
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
      .json({ ok: false, message: "Falta el archivo (campo: file)" });
  }

  try {
    const result = await importClientsFromXlsx(Buffer.from(file.buffer));
    return res.status(200).json({ ok: true, result });
  } catch (err: any) {
    return res.status(400).json({
      ok: false,
      message: err?.message ?? "Error al importar archivo",
    });
  }
}

export async function handleUpdateClient(req: Request, res: Response) {
  const id = Number(req.params.id);

  if (!Number.isFinite(id)) {
    return res.status(400).json({ ok: false, message: "ID invalido" });
  }

  const parsed = updateClientSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({
      ok: false,
      message: "Datos invalidos",
      issues: parsed.error.issues
    });
  }

  try {
    const updated = await updateClient(id, parsed.data);
    return res.json({ ok: true, item: updated });
  } catch (error: any) {
    if (error?.code === "P2025") {
      return res.status(404).json({ ok: false, message: "Cliente no encontrado" });
    }
    if (error?.code === "P2002") {
      return res.status(409).json({ ok: false, message: "El RUT ya existe" });
    }
    throw error;
  }
}