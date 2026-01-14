import { z } from "zod";

const PedidoEstado = ["PENDIENTE", "ENTREGADO", "NO_ENTREGADO"] as const;

export const listPedidosQuerySchema = z.object({
  take: z.coerce.number().int().min(1).max(200).default(20),
  skip: z.coerce.number().int().min(0).default(0),
  estado: z.enum(PedidoEstado).optional(),
  clientId: z.coerce.number().int().positive().optional(),
  search: z.string().optional(), // rut/razonSocial/comentarios
  unassigned: z.coerce.boolean().optional(), // true = pedidos sin asignar a ruta
});

export const createPedidoSchema = z.object({
  clientId: z.coerce.number().int().positive(),
  cajas: z.coerce.number().int().min(1),
  fechaCompromiso: z.coerce.date().optional(),
  comentarios: z.string().max(500).optional(),
});

export const updatePedidoSchema = z.object({
  cajas: z.coerce.number().int().min(1).optional(),
  estado: z.enum(PedidoEstado).optional(),
  fechaCompromiso: z.coerce.date().optional(),
  comentarios: z.string().max(500).optional(),
});
