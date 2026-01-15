import { prisma } from "../../lib/prisma";
import type { PedidoEstado } from "@prisma/client";

export async function listPedidos(params: {
  take: number;
  skip: number;
  estado?: PedidoEstado;
  clientId?: number;
  search?: string;
  unassigned?: boolean;
}) {
  if (params.estado === undefined || params.estado === "PENDIENTE") {
    await prisma.pedido.updateMany({
      where: {
        estado: "PENDIENTE",
        stops: { some: { estadoParada: "COMPLETADA" } },
      },
      data: { estado: "ENTREGADO" },
    });

    await prisma.pedido.updateMany({
      where: {
        estado: "PENDIENTE",
        stops: { some: { estadoParada: "NO_ENTREGADA" } },
      },
      data: { estado: "NO_ENTREGADO" },
    });
  }

  const where: any = {};

  if (params.estado) where.estado = params.estado;
  if (params.clientId) where.clientId = params.clientId;
  if (params.unassigned === true) where.stops = { none: {} };

  if (params.search) {
    const s = params.search;
    where.OR = [
      { comentarios: { contains: s } },
      { client: { rut: { contains: s } } },
      { client: { razonSocial: { contains: s } } },
    ];
  }

  const [items, total] = await Promise.all([
    prisma.pedido.findMany({
      where,
      include: {
        client: true,
        stops: {
          take: 1,
          orderBy: { id: "desc" },
          include: {
            route: {
              select: {
                id: true,
                estado: true,
                fechaRuta: true,
                conductor: { select: { id: true, nombre: true } },
                vehicle: { select: { id: true, patente: true } },
              },
            },
          },
        },
      },
      orderBy: { id: "desc" },
      take: params.take,
      skip: params.skip,
    }),
    prisma.pedido.count({ where }),
  ]);

  return { items, total, take: params.take, skip: params.skip };
}

export async function createPedido(input: {
  clientId: number;
  cajas: number;
  fechaCompromiso?: Date;
  comentarios?: string;
}) {
  const client = await prisma.client.findUnique({
    where: { id: input.clientId },
    select: { id: true },
  });

  if (!client) {
    const err: any = new Error("Client not found");
    err.status = 404;
    throw err;
  }

  const data: any = {
    clientId: input.clientId,
    cajas: input.cajas,
  };
  if (input.fechaCompromiso !== undefined) data.fechaCompromiso = input.fechaCompromiso;
  if (input.comentarios !== undefined) data.comentarios = input.comentarios.trim();

  return prisma.pedido.create({
    data,
    include: { client: true },
  });
}

export async function updatePedido(
  id: number,
  input: {
    cajas?: number;
    estado?: PedidoEstado;
    fechaCompromiso?: Date;
    comentarios?: string;
  }
) {
  const data: any = {};
  if (input.cajas !== undefined) data.cajas = input.cajas;
  if (input.estado !== undefined) data.estado = input.estado;
  if (input.fechaCompromiso !== undefined) data.fechaCompromiso = input.fechaCompromiso;
  if (input.comentarios !== undefined) data.comentarios = input.comentarios.trim();

  return prisma.pedido.update({
    where: { id },
    data,
    include: { client: true },
  });
}

export async function deletePedido(id: number) {
  const openIncidentsCount = await prisma.incident.count({
    where: {
      pedidoId: id,
      estado: { not: "CERRADA" },
    },
  });

  if (openIncidentsCount > 0) {
    const err: any = new Error(
      "No se puede eliminar: el pedido tiene incidencias ABIERTAS o EN REVISIÓN asociadas. Primero ciérralas (estado=CERRADA)."
    );
    err.status = 409;
    throw err;
  }

  return prisma.$transaction(async (tx) => {
    await tx.incident.updateMany({
      where: { pedidoId: id },
      data: { pedidoId: null },
    });

    const stops = await tx.routeStop.findMany({
      where: { pedidoId: id },
      select: { routeId: true },
    });

    const affectedRouteIds = Array.from(new Set(stops.map((s) => s.routeId)));

    if (affectedRouteIds.length > 0) {
      await tx.routeStop.deleteMany({ where: { pedidoId: id } });

      for (const routeId of affectedRouteIds) {
        const remaining = await tx.routeStop.findMany({
          where: { routeId },
          orderBy: { ordenVisita: "asc" },
          select: { id: true },
        });

        for (const [i, stop] of remaining.entries()) {
          await tx.routeStop.update({
            where: { id: stop.id },
            data: { ordenVisita: -(i + 1) },
          });
        }

        for (const [i, stop] of remaining.entries()) {
          await tx.routeStop.update({
            where: { id: stop.id },
            data: { ordenVisita: i + 1 },
          });
        }
      }
    }

    return tx.pedido.delete({
      where: { id },
      include: { client: true },
    });
  });
}