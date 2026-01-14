import type { Request, Response } from "express";
import { z } from "zod";
import { prisma } from "../../lib/prisma";

const updateStatusSchema = z.object({
  estado: z.enum(["PROGRAMADA", "EN_CURSO", "FINALIZADA", "CANCELADA"]),
});

export async function handleUpdateRouteStatus(req: Request, res: Response) {
  const routeId = Number(req.params.id);
  if (!Number.isFinite(routeId)) {
    return res.status(400).json({ ok: false, message: "Invalid route id" });
  }

  const parsed = updateStatusSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ ok: false, message: "Invalid body", issues: parsed.error.issues });
  }

  const user = (req as any).user as { id: number; role: string } | undefined;
  if (!user) return res.status(401).json({ ok: false, message: "Unauthorized" });

  const route = await prisma.route.findUnique({ where: { id: routeId } });
  if (!route) return res.status(404).json({ ok: false, message: "Route not found" });

  // Si es CONDUCTOR: solo puede modificar sus rutas
  if (user.role === "CONDUCTOR" && route.conductorId !== user.id) {
    return res.status(403).json({ ok: false, message: "Forbidden (not your route)" });
  }

  const next = parsed.data.estado;
  const current = route.estado;

  // Validación de transición (workflow)
  // - Conductores: solo pueden avanzar PROGRAMADA -> EN_CURSO -> FINALIZADA (no cancelar)
  // - Backoffice (ADMIN/PLANIFICADOR/SUPERVISOR): pueden CANCELAR desde PROGRAMADA o EN_CURSO
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
    return res.status(409).json({
      ok: false,
      message: "Invalid status transition",
      current,
      next,
      allowedNext: options,
    });
  }

  const updated = await prisma.route.update({
    where: { id: routeId },
    data: { estado: next },
  });

  return res.json({ ok: true, item: updated });
}
