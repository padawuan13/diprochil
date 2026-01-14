import { prisma } from "../../lib/prisma";
import type { IncidenciaEstado, IncidenciaSeveridad } from "@prisma/client";

export async function listIncidents(params: {
  take: number;
  skip: number;
  routeId?: number;
  pedidoId?: number;
  estado?: IncidenciaEstado;
  severidad?: IncidenciaSeveridad;
}) {
  const where: any = {};

  if (params.routeId !== undefined) where.routeId = params.routeId;
  if (params.pedidoId !== undefined) where.pedidoId = params.pedidoId;
  if (params.estado !== undefined) where.estado = params.estado;
  if (params.severidad !== undefined) where.severidad = params.severidad;

  const [items, total] = await Promise.all([
    prisma.incident.findMany({
      where,
      orderBy: [{ fechaHora: "desc" }, { id: "desc" }],
      take: params.take,
      skip: params.skip,
      include: {
        route: { include: { vehicle: true, conductor: { select: { id: true, nombre: true, email: true, role: true } } } },
        pedido: { include: { client: true } },
        createdBy: { select: { id: true, nombre: true, email: true, role: true } },
      },
    }),
    prisma.incident.count({ where }),
  ]);

  return { items, total, take: params.take, skip: params.skip };
}

export async function createIncident(input: {
  routeId: number;
  pedidoId?: number;
  createdById?: number;
  tipo: string;
  descripcion: string;
  severidad?: IncidenciaSeveridad;
}) {
  const route = await prisma.route.findUnique({ where: { id: input.routeId }, select: { id: true } });
  if (!route) {
    const err: any = new Error("Route not found");
    err.status = 404;
    throw err;
  }

  if (input.pedidoId !== undefined) {
    const pedido = await prisma.pedido.findUnique({ where: { id: input.pedidoId }, select: { id: true } });
    if (!pedido) {
      const err: any = new Error("Pedido not found");
      err.status = 404;
      throw err;
    }
  }

  const data: any = {
    routeId: input.routeId,
    tipo: input.tipo.trim(),
    descripcion: input.descripcion.trim(),
  };

  if (input.pedidoId !== undefined) data.pedidoId = input.pedidoId;
  if (input.createdById !== undefined) data.createdById = input.createdById;
  if (input.severidad !== undefined) data.severidad = input.severidad;

  return prisma.incident.create({
    data,
    include: {
      route: { include: { vehicle: true, conductor: { select: { id: true, nombre: true, email: true, role: true } } } },
      pedido: { include: { client: true } },
      createdBy: { select: { id: true, nombre: true, email: true, role: true } },
    },
  });
}

export async function updateIncident(id: number, input: {
  tipo?: string;
  descripcion?: string;
  severidad?: IncidenciaSeveridad;
  estado?: IncidenciaEstado;
}) {
  const incident = await prisma.incident.findUnique({ where: { id }, select: { id: true } });
  if (!incident) {
    const err: any = new Error("Incident not found");
    err.status = 404;
    throw err;
  }

  const data: any = {};
  if (input.tipo !== undefined) data.tipo = input.tipo.trim();
  if (input.descripcion !== undefined) data.descripcion = input.descripcion.trim();
  if (input.severidad !== undefined) data.severidad = input.severidad;
  if (input.estado !== undefined) data.estado = input.estado;

  return prisma.incident.update({
    where: { id },
    data,
    include: {
      route: { include: { vehicle: true, conductor: { select: { id: true, nombre: true, email: true, role: true } } } },
      pedido: { include: { client: true } },
      createdBy: { select: { id: true, nombre: true, email: true, role: true } },
    },
  });
}
