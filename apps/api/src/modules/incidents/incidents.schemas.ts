import { z } from "zod";
import { IncidenciaEstado, IncidenciaSeveridad } from "@prisma/client";

export const listIncidentsQuerySchema = z.object({
  take: z.coerce.number().int().min(1).max(100).default(20),
  skip: z.coerce.number().int().min(0).default(0),

  routeId: z.coerce.number().int().positive().optional(),
  pedidoId: z.coerce.number().int().positive().optional(),

  estado: z.nativeEnum(IncidenciaEstado).optional(),
  severidad: z.nativeEnum(IncidenciaSeveridad).optional(),
});

export const createIncidentSchema = z.object({
  routeId: z.coerce.number().int().positive(),
  pedidoId: z.coerce.number().int().positive().optional(),

  tipo: z.string().min(2).max(80),
  descripcion: z.string().min(5).max(2000),

  severidad: z.nativeEnum(IncidenciaSeveridad).optional(),
});

export const updateIncidentSchema = z.object({
  tipo: z.string().min(2).max(80).optional(),
  descripcion: z.string().min(5).max(2000).optional(),

  severidad: z.nativeEnum(IncidenciaSeveridad).optional(),
  estado: z.nativeEnum(IncidenciaEstado).optional(),
});
