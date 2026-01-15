import type { Request, Response } from "express";
import { z } from "zod";
import { prisma } from "../../lib/prisma";

const updateStatusSchema = z.object({
  estado: z.enum(["PROGRAMADA", "EN_CURSO", "FINALIZADA", "CANCELADA"]),
});

export async function handleUpdateRouteStatus(req: Request, res: Response) {
  const routeId = Number(req.params.id);
  if (!Number.isFinite(routeId)) {
    return res.status(400).json({ ok: false, message: "ID de ruta inválido" });
  }

  const parsed = updateStatusSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ ok: false, message: "Datos inválidos", issues: parsed.error.issues });
  }

  const user = (req as any).user as { id: number; role: string } | undefined;
  if (!user) return res.status(401).json({ ok: false, message: "No autorizado" });

  const route = await prisma.route.findUnique({ where: { id: routeId } });
  if (!route) return res.status(404).json({ ok: false, message: "Ruta no encontrada" });

  if (user.role === "CONDUCTOR" && route.conductorId !== user.id) {
    return res.status(403).json({ ok: false, message: "No tienes permiso para modificar esta ruta" });
  }

  const next = parsed.data.estado;
  const current = route.estado;

  const allowedConductor: Record<string, string[]> = {
    PROGRAMADA: ["EN_CURSO"],
    EN_CURSO: ["FINALIZADA"],
    FINALIZADA: [],
    CANCELADA: [],
  };

  const allowedBackoffice: Record<string, string[]> = {
    PROGRAMADA: ["EN_CURSO", "CANCELADA"],
    EN_CURSO: ["FINALIZADA", "CANCELADA"],
    FINALIZADA: [],
    CANCELADA: [],
  };

  const allowed = user.role === "CONDUCTOR" ? allowedConductor : allowedBackoffice;
  const options = allowed[current] ?? [];

  if (!options.includes(next)) {
    const estadoActual = current === "PROGRAMADA" ? "programada" : current === "EN_CURSO" ? "en curso" : current.toLowerCase();
    return res.status(409).json({
      ok: false,
      message: `No se puede cambiar de estado. La ruta está ${estadoActual} y no permite esta transición.`,
      current,
      next,
      allowedNext: options,
    });
  }

  if (next === "FINALIZADA") {
    const paradasPendientes = await prisma.routeStop.count({
      where: {
        routeId,
        estadoParada: { in: ["PENDIENTE", "EN_CURSO"] },
      },
    });

    if (paradasPendientes > 0) {
      return res.status(409).json({
        ok: false,
        message: `No se puede finalizar la ruta. Hay ${paradasPendientes} parada(s) pendiente(s) o en curso.`,
        paradasPendientes,
      });
    }
  }

  const updated = await prisma.route.update({
    where: { id: routeId },
    data: { estado: next },
  });

  return res.json({ ok: true, item: updated });
}
