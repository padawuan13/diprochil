import { z } from "zod";

const Roles = ["ADMIN", "PLANIFICADOR", "SUPERVISOR", "CONDUCTOR"] as const;

export const createUserSchema = z.object({
  nombre: z.string().min(2).max(120),
  email: z.string().email(),
  password: z.string().min(6).max(200),
  role: z.enum(Roles),
  active: z.boolean().optional(),
});

export const listUsersQuerySchema = z.object({
  take: z.coerce.number().int().min(1).max(200).default(20),
  skip: z.coerce.number().int().min(0).default(0),
  search: z.string().optional(),
  role: z.enum(Roles).optional(),
  active: z.coerce.boolean().optional(),
});

export const updateUserSchema = z.object({
  nombre: z.string().min(2).max(120).optional(),
  email: z.string().email().optional(),
  role: z.enum(Roles).optional(),
  active: z.boolean().optional(),
});

export const changePasswordSchema = z.object({
  password: z.string().min(6).max(200),
});
