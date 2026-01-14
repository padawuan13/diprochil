import { prisma } from "../../lib/prisma";
import type { VehicleStatus } from "@prisma/client";

export async function listVehicles(params: {
  take: number;
  skip: number;
  search?: string;
  estado?: VehicleStatus;
  activeOnly?: boolean;
}) {
  const where: any = {};

  if (params.estado) where.estado = params.estado;
  if (params.activeOnly) where.estado = { not: "INACTIVO" };

  if (params.search) {
    where.OR = [
      { patente: { contains: params.search } },
      { tipo: { contains: params.search } },
    ];
  }

  const [items, total] = await Promise.all([
    prisma.vehicle.findMany({
      where,
      orderBy: { id: "desc" },
      take: params.take,
      skip: params.skip,
    }),
    prisma.vehicle.count({ where }),
  ]);

  return { items, total, take: params.take, skip: params.skip };
}

export async function createVehicle(input: {
  patente: string;
  capacidadKg?: number;
  tipo?: string;
  estado?: VehicleStatus;
  observaciones?: string;
}) {
  const data: any = {
    patente: input.patente,
    estado: input.estado ?? "ACTIVO",
  };

  if (input.capacidadKg !== undefined) data.capacidadKg = input.capacidadKg;
  if (input.tipo !== undefined) data.tipo = input.tipo.trim();
  if (input.observaciones !== undefined) data.observaciones = input.observaciones.trim();

  return prisma.vehicle.create({ data });
}

export async function updateVehicle(
  id: number,
  input: {
    patente?: string;
    capacidadKg?: number;
    tipo?: string;
    estado?: VehicleStatus;
    observaciones?: string;
  }
) {
  const data: any = {};
  if (input.patente !== undefined) data.patente = input.patente;
  if (input.capacidadKg !== undefined) data.capacidadKg = input.capacidadKg;
  if (input.tipo !== undefined) data.tipo = input.tipo?.trim();
  if (input.estado !== undefined) data.estado = input.estado;
  if (input.observaciones !== undefined) data.observaciones = input.observaciones?.trim();

  return prisma.vehicle.update({
    where: { id },
    data,
  });
}
