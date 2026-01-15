import bcrypt from "bcryptjs";
import { prisma } from "../../lib/prisma";
import type { UserRole } from "@prisma/client";

export async function createUser(input: {
  nombre: string;
  email: string;
  password: string;
  role: UserRole;
  active?: boolean;
}) {
  const passwordHash = await bcrypt.hash(input.password, 10);

  return prisma.user.create({
    data: {
      nombre: input.nombre.trim(),
      email: input.email.toLowerCase().trim(),
      passwordHash,
      role: input.role,
      active: input.active ?? true,
    },
    select: { id: true, nombre: true, email: true, role: true, active: true, createdAt: true },
  });
}

export async function listUsers(params: {
  take: number;
  skip: number;
  search?: string;
  role?: UserRole;
  active?: boolean;
}) {
  const where: any = {};

  if (params.active !== undefined) where.active = params.active;
  if (params.role) where.role = params.role;

  if (params.search) {
    where.OR = [
      { nombre: { contains: params.search } },
      { email: { contains: params.search } },
    ];
  }

  const [items, total] = await Promise.all([
    prisma.user.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: params.take,
      skip: params.skip,
      select: { id: true, nombre: true, email: true, role: true, active: true, createdAt: true },
    }),
    prisma.user.count({ where }),
  ]);

  return { items, total, take: params.take, skip: params.skip };
}

export async function updateUser(id: number, input: {
  nombre?: string;
  email?: string;
  role?: UserRole;
  active?: boolean;
}) {
  const data: any = {};
  if (input.nombre !== undefined) data.nombre = input.nombre.trim();
  if (input.email !== undefined) data.email = input.email.toLowerCase().trim();
  if (input.role !== undefined) data.role = input.role;
  if (input.active !== undefined) data.active = input.active;

  return prisma.user.update({
    where: { id },
    data,
    select: { id: true, nombre: true, email: true, role: true, active: true, createdAt: true },
  });
}

export async function changePassword(id: number, password: string) {
  const passwordHash = await bcrypt.hash(password, 10);

  return prisma.user.update({
    where: { id },
    data: { passwordHash },
    select: { id: true, email: true },
  });
}
