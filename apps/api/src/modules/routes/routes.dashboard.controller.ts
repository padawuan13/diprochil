import type { Request, Response } from "express";
import { prisma } from "../../lib/prisma";

export async function handleRouteDashboard(req: Request, res: Response) {
  const routeId = Number(req.params.id);
  if (!Number.isFinite(routeId)) {
    return res.status(400).json({ ok: false, message: "Invalid route id" });
  }

  const user = (req as any).user as { id: number; role: string } | undefined;

  const route = await prisma.route.findUnique({
    where: { id: routeId },
    include: {
      vehicle: true,
      conductor: { select: { id: true, nombre: true, email: true, role: true, active: true } },
      stops: {
        orderBy: { ordenVisita: "asc" },
        include: {
          pedido: {
            include: { client: true },
          },
        },
      },
      incidents: {
        orderBy: [{ fechaHora: "desc" }, { id: "desc" }],
        include: {
          pedido: { include: { client: true } },
          createdBy: { select: { id: true, nombre: true, email: true, role: true } },
        },
      },
    },
  });

  if (!route) {
    return res.status(404).json({ ok: false, message: "Route not found" });
  }

  if (user?.role === "CONDUCTOR" && route.conductorId !== user.id) {
    return res.status(403).json({ ok: false, message: "No tienes acceso a esta ruta" });
  }

  const stopCounts = {
    PENDIENTE: 0,
    EN_CURSO: 0,
    COMPLETADA: 0,
    NO_ENTREGADA: 0,
  } as Record<string, number>;

  for (const s of route.stops) {
    stopCounts[s.estadoParada] = (stopCounts[s.estadoParada] ?? 0) + 1;
  }

  const incidentCounts = {
    ABIERTA: 0,
    CERRADA: 0,
  } as Record<string, number>;

  for (const i of route.incidents) {
    incidentCounts[i.estado] = (incidentCounts[i.estado] ?? 0) + 1;
  }

  const totalCajas = route.stops.reduce((acc, s) => acc + (s.pedido?.cajas ?? 0), 0);

  return res.json({
    ok: true,
    item: route,
    summary: {
      stops: stopCounts,
      incidents: incidentCounts,
      totalStops: route.stops.length,
      totalIncidents: route.incidents.length,
      totalCajas,
    },
  });
}
