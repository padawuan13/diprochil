import type { Request, Response } from "express";
import {
  createRouteSchema,
  createStopSchema,
  listRoutesQuerySchema,
  updateStopSchema,
} from "./routes.schemas";
import {
  addStopToRoute,
  createRoute,
  deleteStop,
  deleteRoute,
  getRouteById,
  listRoutes,
  updateStop,
  getConductoresConCarga,
  autoAsignarConductorYVehiculo,
} from "./routes.service";
import { prisma } from "../../lib/prisma";
import { z } from "zod";
import { optimizarRuta, type PuntoRuta } from "./routes.optimizer.service";
import { importarExcelRutas, previewExcelRutas } from "./routes.import.service";

type RequestWithFile = Request & { file?: Express.Multer.File };

type AuthUser = {
  id: number;
  role: "ADMIN" | "PLANIFICADOR" | "SUPERVISOR" | "CONDUCTOR";
  email: string;
};

function getAuthUser(req: Request): AuthUser | undefined {
  return req.user;
}

type UpdateStopInput = Parameters<typeof updateStop>[2];
type UpdateStopActor = Parameters<typeof updateStop>[3];

export async function handleListRoutes(req: Request, res: Response) {
  const parsed = listRoutesQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    return res
      .status(400)
      .json({ ok: false, message: "Invalid query", issues: parsed.error.issues });
  }

  const q = parsed.data;
  const params = {
    take: q.take,
    skip: q.skip,
    ...(q.estado !== undefined ? { estado: q.estado } : {}),
    ...(q.conductorId !== undefined ? { conductorId: q.conductorId } : {}),
    ...(q.vehicleId !== undefined ? { vehicleId: q.vehicleId } : {}),
    ...(q.dateFrom !== undefined ? { dateFrom: q.dateFrom } : {}),
    ...(q.dateTo !== undefined ? { dateTo: q.dateTo } : {}),
  };

  const data = await listRoutes(params);
  return res.json({ ok: true, ...data });
}

export async function handleGetRoute(req: Request, res: Response) {
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) {
    return res.status(400).json({ ok: false, message: "Invalid id" });
  }

  const route = await getRouteById(id);
  if (!route) {
    return res.status(404).json({ ok: false, message: "Route not found" });
  }

  return res.json({ ok: true, item: route });
}

export async function handleCreateRoute(req: Request, res: Response) {
  const parsed = createRouteSchema.safeParse(req.body);
  if (!parsed.success) {
    return res
      .status(400)
      .json({ ok: false, message: "Invalid body", issues: parsed.error.issues });
  }

  const b = parsed.data;
  const input = {
    conductorId: b.conductorId,
    vehicleId: b.vehicleId,
    fechaRuta: b.fechaRuta,
    ...(b.zona !== undefined ? { zona: b.zona } : {}),
    ...(b.horaInicioProg !== undefined ? { horaInicioProg: b.horaInicioProg } : {}),
    ...(b.horaFinProg !== undefined ? { horaFinProg: b.horaFinProg } : {}),
    ...(b.estado !== undefined ? { estado: b.estado } : {}),
  };

  try {
    const created = await createRoute(input);
    return res.status(201).json({ ok: true, item: created });
  } catch (err: any) {
    if (err?.status) {
      return res.status(err.status).json({ ok: false, message: err.message });
    }
    throw err;
  }
}

export async function handleAddStop(req: Request, res: Response) {
  const routeId = Number(req.params.id);
  if (!Number.isFinite(routeId)) {
    return res.status(400).json({ ok: false, message: "Invalid route id" });
  }

  const parsed = createStopSchema.safeParse(req.body);
  if (!parsed.success) {
    return res
      .status(400)
      .json({ ok: false, message: "Invalid body", issues: parsed.error.issues });
  }

  const b = parsed.data;
  const input = {
    pedidoId: b.pedidoId,
    ...(b.ordenVisita !== undefined ? { ordenVisita: b.ordenVisita } : {}),
    ...(b.horaEstimada !== undefined ? { horaEstimada: b.horaEstimada } : {}),
    ...(b.ventanaDesde !== undefined ? { ventanaDesde: b.ventanaDesde } : {}),
    ...(b.ventanaHasta !== undefined ? { ventanaHasta: b.ventanaHasta } : {}),
    ...(b.estadoParada !== undefined ? { estadoParada: b.estadoParada } : {}),
  };

  try {
    const created = await addStopToRoute(routeId, input);
    return res.status(201).json({ ok: true, item: created });
  } catch (err: any) {
    if (err?.status) {
      return res.status(err.status).json({ ok: false, message: err.message });
    }
    if (err?.code === "P2002") {
      return res.status(409).json({
        ok: false,
        message: "Duplicate ordenVisita in this route",
      });
    }
    throw err;
  }
}

export async function handleUpdateStop(req: Request, res: Response) {
  const actor = getAuthUser(req);
  const routeId = Number(req.params.id);
  const stopId = Number(req.params.stopId);

  if (!Number.isFinite(routeId) || !Number.isFinite(stopId)) {
    return res.status(400).json({ ok: false, message: "Invalid ids" });
  }

  const parsed = updateStopSchema.safeParse(req.body ?? {});
  if (!parsed.success) {
    return res
      .status(400)
      .json({ ok: false, message: "Invalid body", issues: parsed.error.issues });
  }

  if (actor?.role === "CONDUCTOR") {
    const route = await prisma.route.findUnique({
      where: { id: routeId },
      select: { id: true, conductorId: true },
    });

    if (!route) {
      return res.status(404).json({ ok: false, message: "Route not found" });
    }
    if (route.conductorId !== actor.id) {
      return res.status(403).json({ ok: false, message: "Forbidden (not your route)" });
    }
  }

  const b = parsed.data;

  const incidenteInput: UpdateStopInput["incidente"] =
    b.incidente
      ? {
          tipo: b.incidente.tipo,
          descripcion: b.incidente.descripcion,
          ...(b.incidente.severidad !== undefined ? { severidad: b.incidente.severidad } : {}),
        }
      : undefined;

  const input: UpdateStopInput = {
    ...(b.ordenVisita !== undefined ? { ordenVisita: b.ordenVisita } : {}),
    ...(b.horaEstimada !== undefined ? { horaEstimada: b.horaEstimada } : {}),
    ...(b.ventanaDesde !== undefined ? { ventanaDesde: b.ventanaDesde } : {}),
    ...(b.ventanaHasta !== undefined ? { ventanaHasta: b.ventanaHasta } : {}),
    ...(b.estadoParada !== undefined ? { estadoParada: b.estadoParada } : {}),
    ...(incidenteInput ? { incidente: incidenteInput } : {}),
  };

  if (Object.keys(input).length === 0) {
    return res.status(400).json({ ok: false, message: "No fields to update" });
  }

  const actorForService: UpdateStopActor =
    actor ? { id: actor.id, role: actor.role } : undefined;

  try {
    const updated = await updateStop(routeId, stopId, input, actorForService);
    return res.json({ ok: true, item: updated });
  } catch (err: any) {
    if (err?.status) {
      return res.status(err.status).json({ ok: false, message: err.message });
    }
    if (err?.code === "P2002") {
      return res.status(409).json({
        ok: false,
        message: "Duplicate ordenVisita in this route",
      });
    }
    throw err;
  }
}

export async function handleDeleteStop(req: Request, res: Response) {
  const routeId = Number(req.params.id);
  const stopId = Number(req.params.stopId);

  if (!Number.isFinite(routeId) || !Number.isFinite(stopId)) {
    return res.status(400).json({ ok: false, message: "Invalid ids" });
  }

  try {
    const result = await deleteStop(routeId, stopId);
    return res.json({ ok: true, ...result });
  } catch (err: any) {
    if (err?.status) {
      return res.status(err.status).json({ ok: false, message: err.message });
    }
    throw err;
  }
}

export async function handleDeleteRoute(req: Request, res: Response) {
  const routeId = Number(req.params.id);

  if (!Number.isFinite(routeId)) {
    return res.status(400).json({ ok: false, message: "Invalid route id" });
  }

  const deletePedidos = req.query.deletePedidos === "true";

  try {
    const result = await deleteRoute(routeId, deletePedidos);
    return res.json({ ok: true, ...result });
  } catch (err: any) {
    if (err?.status) {
      return res.status(err.status).json({ ok: false, message: err.message });
    }
    throw err;
  }
}

export async function handleOptimizeRoute(req: Request, res: Response) {
  const schema = z.object({
    pedidoIds: z.array(z.number()).min(1),
  });

  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({
      ok: false,
      message: "Invalid body",
      issues: parsed.error.issues,
    });
  }

  try {
    const pedidos = await prisma.pedido.findMany({
      where: {
        id: { in: parsed.data.pedidoIds },
      },
      include: {
        client: {
          select: {
            id: true,
            razonSocial: true,
            direccion: true,
            comuna: true,
            latitud: true,
            longitud: true,
          },
        },
      },
    });

    const sinCoordenadas = pedidos.filter(
      (p) => !p.client.latitud || !p.client.longitud
    );

    if (sinCoordenadas.length > 0) {
      return res.status(400).json({
        ok: false,
        message: `${sinCoordenadas.length} clientes sin coordenadas`,
        clientesSinCoordenadas: sinCoordenadas.map((p) => ({
          pedidoId: p.id,
          cliente: p.client.razonSocial,
        })),
      });
    }

    const puntos: PuntoRuta[] = pedidos.map((p) => ({
      id: p.client.id,
      pedidoId: p.id,
      clienteNombre: p.client.razonSocial,
      direccion: p.client.direccion || undefined,
      comuna: p.client.comuna,
      latitud: p.client.latitud!,
      longitud: p.client.longitud!,
    }));

    const rutaOptimizada = optimizarRuta(puntos);

    return res.json({
      ok: true,
      rutaOptimizada: {
        puntos: rutaOptimizada.puntos,
        orden: rutaOptimizada.orden,
        distanciaTotal: rutaOptimizada.distanciaTotal,
        tiempoEstimado: rutaOptimizada.tiempoEstimado,
        metricas: {
          distanciaKm: rutaOptimizada.distanciaTotal,
          tiempoHoras: Math.round((rutaOptimizada.tiempoEstimado / 60) * 10) / 10,
          tiempoMinutos: rutaOptimizada.tiempoEstimado,
          paradas: rutaOptimizada.puntos.length,
        },
      },
    });
  } catch (error: any) {
    return res.status(500).json({
      ok: false,
      message: error.message || "Error optimizing route",
    });
  }
}

export async function handlePreviewImportExcel(req: Request, res: Response) {
  const file = (req as RequestWithFile).file;

  if (!file) {
    return res
      .status(400)
      .json({ ok: false, message: "Missing file (field name: file)" });
  }

  try {
    const groupBy = (req.body?.groupBy === "ciudad" ? "ciudad" : "comuna") as
      import("./routes.import.service").GroupByZona;
    const result = await previewExcelRutas(Buffer.from(file.buffer), groupBy);
    return res.json(result);
  } catch (error: any) {
    return res.status(400).json({
      ok: false,
      message: error.message || "Error al procesar Excel",
    });
  }
}

export async function handleImportExcel(req: Request, res: Response) {
  const file = (req as RequestWithFile).file;

  if (!file) {
    return res
      .status(400)
      .json({ ok: false, message: "Missing file (field name: file)" });
  }

  const schema = z.object({
    fechaCompromiso: z
      .string()
      .optional()
      .transform((v) => (v ? new Date(v) : undefined)),
  });

  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({
      ok: false,
      message: "Invalid body",
      issues: parsed.error.issues,
    });
  }

  try {
    const groupBy = (req.body?.groupBy === "ciudad" ? "ciudad" : "comuna") as
      import("./routes.import.service").GroupByZona;
    const result = await importarExcelRutas(
      Buffer.from(file.buffer),
      parsed.data.fechaCompromiso,
      groupBy
    );
    return res.json(result);
  } catch (error: any) {
    return res.status(400).json({
      ok: false,
      message: error.message || "Error importing Excel",
    });
  }
}

export async function handleImportExcelConRutas(req: Request, res: Response) {
  const file = (req as RequestWithFile).file;

  if (!file) {
    return res
      .status(400)
      .json({ ok: false, message: "Missing file (field name: file)" });
  }

  let rutasConfigParsed: any[];
  try {
    rutasConfigParsed = JSON.parse(req.body.rutasConfig || "[]");
  } catch (err) {
    return res.status(400).json({
      ok: false,
      message: "Invalid rutasConfig JSON",
    });
  }

  const schema = z.object({
    fechaCompromiso: z
      .string()
      .optional()
      .transform((v) => (v ? new Date(v) : undefined)),
    rutasConfig: z.array(
      z.object({
        comuna: z.string(),
        conductorId: z.number(),
        vehicleId: z.number(),
      })
    ),
    groupBy: z.enum(["comuna", "ciudad"]).optional(),
  });

  const parsed = schema.safeParse({
    fechaCompromiso: req.body.fechaCompromiso,
    rutasConfig: rutasConfigParsed,
    groupBy: req.body.groupBy,
  });

  if (!parsed.success) {
    return res.status(400).json({
      ok: false,
      message: "Invalid body",
      issues: parsed.error.issues,
    });
  }

  try {
    const { importarExcelConRutas } = await import("./routes.service");
    const result = await importarExcelConRutas(
      Buffer.from(file.buffer),
      parsed.data.fechaCompromiso,
      parsed.data.rutasConfig,
      parsed.data.groupBy ?? "comuna"
    );
    return res.json(result);
  } catch (error: any) {
    return res.status(400).json({
      ok: false,
      message: error.message || "Error importing Excel with routes",
    });
  }
}

export async function handleGetConductoresCarga(req: Request, res: Response) {
  const schema = z.object({
    fecha: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  });

  const parsed = schema.safeParse(req.query);
  if (!parsed.success) {
    return res.status(400).json({
      ok: false,
      message: "Invalid query",
      issues: parsed.error.issues,
    });
  }

  const fechaStr = parsed.data.fecha || new Date().toISOString().split("T")[0];
  const fecha = new Date(`${fechaStr}T12:00:00.000Z`);

  try {
    const conductores = await getConductoresConCarga(fecha);
    return res.json({
      ok: true,
      fecha: fechaStr,
      conductores,
    });
  } catch (error: any) {
    return res.status(500).json({
      ok: false,
      message: error.message || "Error al obtener conductores",
    });
  }
}

export async function handleAutoAsignar(req: Request, res: Response) {
  const schema = z.object({
    fecha: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    zona: z.string().optional(),
  });

  const parsed = schema.safeParse(req.query);
  if (!parsed.success) {
    return res.status(400).json({
      ok: false,
      message: "Invalid query",
      issues: parsed.error.issues,
    });
  }

  const fecha = new Date(`${parsed.data.fecha}T12:00:00.000Z`);

  try {
    const asignacion = await autoAsignarConductorYVehiculo(fecha, parsed.data.zona);

    if (!asignacion) {
      return res.status(404).json({
        ok: false,
        message: "No hay conductores disponibles",
      });
    }

    return res.json({
      ok: true,
      ...asignacion,
    });
  } catch (error: any) {
    return res.status(500).json({
      ok: false,
      message: error.message || "Error al auto-asignar",
    });
  }
}