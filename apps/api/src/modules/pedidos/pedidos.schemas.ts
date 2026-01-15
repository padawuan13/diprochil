import { z } from "zod";

const PedidoEstado = ["PENDIENTE", "ENTREGADO", "NO_ENTREGADO"] as const;

/**
 * Parser de fecha que ajusta al mediodía UTC para evitar desfases de timezone
 */
const dateAtNoon = z.preprocess((val) => {
  if (!val) return undefined;

  if (typeof val === "string") {
    const dateOnlyMatch = val.match(/^(\d{4}-\d{2}-\d{2})$/);
    if (dateOnlyMatch) {
      return new Date(`${dateOnlyMatch[1]}T12:00:00.000Z`);
    }
    if (val.includes("T00:00:00") || val.includes("T00:00:00.000Z")) {
      return new Date(val.replace("T00:00:00", "T12:00:00"));
    }
  }

  return new Date(val as string | number | Date);
}, z.date());

export const listPedidosQuerySchema = z.object({
  take: z.coerce.number().int().min(1).max(200).default(20),
  skip: z.coerce.number().int().min(0).default(0),
  estado: z.enum(PedidoEstado).optional(),
  clientId: z.coerce.number().int().positive().optional(),
  search: z.string().optional(),
  unassigned: z.coerce.boolean().optional(),
});

export const createPedidoSchema = z.object({
  clientId: z.coerce.number().int().positive(),
  cajas: z.coerce.number().int().min(1),
  fechaCompromiso: dateAtNoon.optional(),
  comentarios: z.string().max(500).optional(),
});

export const updatePedidoSchema = z.object({
  cajas: z.coerce.number().int().min(1).optional(),
  estado: z.enum(PedidoEstado).optional(),
  fechaCompromiso: dateAtNoon.optional(),
  comentarios: z.string().max(500).optional(),
});
