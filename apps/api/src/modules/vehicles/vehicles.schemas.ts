import { z } from "zod";

const VehicleStatus = ["ACTIVO", "INACTIVO", "MANTENCION"] as const;

export const listVehiclesQuerySchema = z.object({
  take: z.coerce.number().int().min(1).max(200).default(20),
  skip: z.coerce.number().int().min(0).default(0),
  search: z.string().optional(), // patente / tipo
  estado: z.enum(VehicleStatus).optional(),
  activeOnly: z.coerce.boolean().optional(), // atajo: true => no INACTIVO
});

export const createVehicleSchema = z.object({
  patente: z.string().min(5).max(12).transform((v) => v.trim().toUpperCase()),
  capacidadKg: z.coerce.number().int().positive().optional(),
  tipo: z.string().max(80).optional(),
  estado: z.enum(VehicleStatus).optional(),
  observaciones: z.string().max(500).optional(),
});

export const updateVehicleSchema = z.object({
  patente: z.string().min(5).max(12).transform((v) => v.trim().toUpperCase()).optional(),
  capacidadKg: z.coerce.number().int().positive().optional(),
  tipo: z.string().max(80).optional(),
  estado: z.enum(VehicleStatus).optional(),
  observaciones: z.string().max(500).optional(),
});
