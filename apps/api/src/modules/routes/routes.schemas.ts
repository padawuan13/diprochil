import { z } from "zod";
import { IncidenciaSeveridad, ParadaEstado, RutaEstado } from "@prisma/client";

const timeString = z
  .string()
  .regex(/^([01]\d|2[0-3]):([0-5]\d)(:([0-5]\d))?$/, "Time must be HH:MM or HH:MM:SS");

// ✅ Estado de parada con alias amigables
const paradaEstadoSchema = z.preprocess((v) => {
  if (typeof v !== "string") return v;

  const upper = v.toUpperCase().trim();

  // Alias "amigables"
  if (upper === "ENTREGADA" || upper === "ENTREGADO") return "COMPLETADA";

  return upper;
}, z.nativeEnum(ParadaEstado));

// ✅ Severidad normalizada (BAJA/MEDIA/ALTA/CRITICA)
const severidadSchema = z.preprocess((v) => {
  if (typeof v !== "string") return v;
  return v.toUpperCase().trim();
}, z.nativeEnum(IncidenciaSeveridad));

// ✅ Schema único de incidente
export const stopIncidentSchema = z
  .object({
    tipo: z.string().min(2, "tipo requerido").max(80),
    descripcion: z.string().min(5, "descripcion requerida").max(500),
    severidad: severidadSchema.optional(),
  })
  .strict();

export const listRoutesQuerySchema = z
  .object({
    take: z.coerce.number().int().min(1).max(200).default(20),
    skip: z.coerce.number().int().min(0).default(0),

    estado: z.nativeEnum(RutaEstado).optional(),
    conductorId: z.coerce.number().int().positive().optional(),
    vehicleId: z.coerce.number().int().positive().optional(),

    dateFrom: z.coerce.date().optional(),
    dateTo: z.coerce.date().optional(),
  })
  .strict();

export const createRouteSchema = z
  .object({
    conductorId: z.coerce.number().int().positive(),
    vehicleId: z.coerce.number().int().positive(),
    fechaRuta: z.coerce.date(),

    zona: z.string().max(120).optional(),
    horaInicioProg: timeString.optional(),
    horaFinProg: timeString.optional(),
    estado: z.nativeEnum(RutaEstado).optional(),
  })
  .strict();

export const createStopSchema = z
  .object({
    pedidoId: z.coerce.number().int().positive(),
    ordenVisita: z.coerce.number().int().min(1).optional(),

    horaEstimada: timeString.optional(),
    ventanaDesde: timeString.optional(),
    ventanaHasta: timeString.optional(),
    estadoParada: paradaEstadoSchema.optional(),
  })
  .strict();

export const updateStopSchema = z
  .object({
    ordenVisita: z.coerce.number().int().min(1).optional(),
    horaEstimada: timeString.optional(),
    ventanaDesde: timeString.optional(),
    ventanaHasta: timeString.optional(),
    estadoParada: paradaEstadoSchema.optional(),
    incidente: stopIncidentSchema.optional(),
  })
  .strict()
  .superRefine((val, ctx) => {
    // ✅ incidente SOLO si estadoParada = NO_ENTREGADA
    if (val.incidente && val.estadoParada !== "NO_ENTREGADA") {
      ctx.addIssue({
        code: "custom",
        path: ["incidente"],
        message: "incidente solo se permite cuando estadoParada = NO_ENTREGADA",
      });
    }
  });
