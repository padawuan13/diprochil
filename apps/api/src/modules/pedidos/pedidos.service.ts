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
  // ✅ Auto-sincronización de estados (corrige datos antiguos):
  // Solo tiene sentido cuando estamos listando PENDIENTE o sin filtro.
  if (params.estado === undefined || params.estado === "PENDIENTE") {
    // Si un pedido sigue en PENDIENTE pero su parada ya está COMPLETADA/NO_ENTREGADA,
    // actualizamos su estado para que Pedidos/Reportes reflejen la realidad.
    // - Primero ENTREGADO (por COMPLETADA)
    // - Luego NO_ENTREGADO (por NO_ENTREGADA) solo para los que aún siguen PENDIENTE
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
  if (params.unassigned === true) where.stops = { none: {} }; // sin paradas asignadas

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
        // Para reflejar en UI la asignación (ruta/conductor/vehículo)
        // tomamos la última parada (si existe)
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

/**
 * Eliminar un pedido.
 * Regla:
 * - Se permite eliminar aunque esté asignado a una ruta.
 *   En ese caso se eliminan primero sus paradas (RouteStop) para evitar
 *   que el pedido "salga a reparto" por error.
 * - NO se permite eliminar si tiene incidencias asociadas ABIERTAS o EN_REVISION.
 *   Si las incidencias están CERRADAS, se desasocian (pedidoId = null) para
 *   mantener trazabilidad sin bloquear la eliminación.
 */
export async function deletePedido(id: number) {
  // ✅ Se permite eliminar el pedido si las incidencias asociadas están CERRADAS.
  // Si existe alguna incidencia ABIERTA o EN_REVISION, se bloquea (409) para no perder trazabilidad.
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

  // Transacción para mantener consistencia: si está asignado a una ruta,
  // eliminamos primero su(s) parada(s) y reindexamos el orden de visita.
  return prisma.$transaction(async (tx) => {
    // 0) Si hay incidencias CERRADAS asociadas, se desasocian del pedido
    // para permitir borrar el pedido sin romper la integridad referencial.
    await tx.incident.updateMany({
      where: { pedidoId: id },
      data: { pedidoId: null },
    });

    const stops = await tx.routeStop.findMany({
      where: { pedidoId: id },
      select: { routeId: true },
    });

    const affectedRouteIds = Array.from(new Set(stops.map((s) => s.routeId)));

    // 1) Quitar asignación de rutas (si existe)
    if (affectedRouteIds.length > 0) {
      await tx.routeStop.deleteMany({ where: { pedidoId: id } });

      // 2) Reindexar orden de visita para evitar huecos (mantiene el orden relativo)
      for (const routeId of affectedRouteIds) {
        const remaining = await tx.routeStop.findMany({
          where: { routeId },
          orderBy: { ordenVisita: "asc" },
          select: { id: true },
        });

        // Paso A: asignar temporalmente valores negativos para evitar colisiones
        // (usamos entries() para evitar TS2532 con noUncheckedIndexedAccess)
        for (const [i, stop] of remaining.entries()) {
          await tx.routeStop.update({
            where: { id: stop.id },
            data: { ordenVisita: -(i + 1) },
          });
        }

        // Paso B: asignar 1..N definitivo
        for (const [i, stop] of remaining.entries()) {
          await tx.routeStop.update({
            where: { id: stop.id },
            data: { ordenVisita: i + 1 },
          });
        }
      }
    }

    // Nota: PedidoDetalle tiene onDelete: Cascade.
    return tx.pedido.delete({
      where: { id },
      include: { client: true },
    });
  });
}