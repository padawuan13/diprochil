import { z } from "zod";

export const createClientSchema = z.object({
  rut: z.string().min(3).max(20),
  razonSocial: z.string().min(2).max(200),
  comuna: z.string().min(2).max(200),
  ciudad: z.string().min(2).max(200),
  giro: z.string().max(200).optional(),
  telefono: z.string().max(50).optional(),
  direccion: z.string().max(200).optional(),
  isla: z.string().max(100).optional(),
  active: z.boolean().optional(),
  latitud: z.number().optional(),   // ← AGREGADO
  longitud: z.number().optional(),  // ← AGREGADO
});

export const listClientsQuerySchema = z.object({
  search: z.string().max(200).optional(),
  comuna: z.string().max(200).optional(),
  ciudad: z.string().max(200).optional(),
  active: z
    .enum(["true", "false"])
    .optional()
    .transform((v) => (v === undefined ? undefined : v === "true")),
  take: z
    .string()
    .optional()
    .transform((v) => (v ? Number(v) : 20)),
  skip: z
    .string()
    .optional()
    .transform((v) => (v ? Number(v) : 0)),
});

export const updateClientSchema = z.object({
  rut: z.string().optional(),
  razonSocial: z.string().optional(),
  comuna: z.string().optional(),
  ciudad: z.string().optional(),
  giro: z.string().optional(),
  telefono: z.string().optional(),
  direccion: z.string().optional(),
  isla: z.string().optional(),
  active: z.boolean().optional(),
  latitud: z.number().optional(),   // ← AGREGADO
  longitud: z.number().optional(),  // ← AGREGADO
});