import { prisma } from "../../lib/prisma";
import { UserRole, VehicleStatus, ParadaEstado } from "@prisma/client";
import type { RutaEstado, IncidenciaSeveridad, UserRole as UserRoleType } from "@prisma/client";

type Actor = { id: number; role: UserRoleType };

function timeToDate(t: string): Date {
  const tt = t.length === 5 ? `${t}:00` : t;
  return new Date(`1970-01-01T${tt}.000Z`);
}

export async function listRoutes(params: {
  take: number;
  skip: number;
  estado?: RutaEstado;
  conductorId?: number;
  vehicleId?: number;
  dateFrom?: Date;
  dateTo?: Date;
}) {
  const where: any = {};

  if (params.estado) where.estado = params.estado;
  if (params.conductorId) where.conductorId = params.conductorId;
  if (params.vehicleId) where.vehicleId = params.vehicleId;

  if (params.dateFrom || params.dateTo) {
    where.fechaRuta = {};
    if (params.dateFrom) where.fechaRuta.gte = params.dateFrom;
    if (params.dateTo) where.fechaRuta.lte = params.dateTo;
  }

  const [items, total] = await Promise.all([
    prisma.route.findMany({
      where,
      orderBy: [{ fechaRuta: "desc" }, { id: "desc" }],
      take: params.take,
      skip: params.skip,
      include: {
        vehicle: true,
        conductor: { select: { id: true, nombre: true, email: true, role: true, active: true } },
        _count: { select: { stops: true, incidents: true } },
      },
    }),
    prisma.route.count({ where }),
  ]);

  return { items, total, take: params.take, skip: params.skip };
}

export async function getRouteById(id: number) {
  return prisma.route.findUnique({
    where: { id },
    include: {
      vehicle: true,
      conductor: { select: { id: true, nombre: true, email: true, role: true, active: true } },
      stops: {
        orderBy: { ordenVisita: "asc" },
        include: { pedido: { include: { client: true } } },
      },
      incidents: { orderBy: { id: "desc" } },
    },
  });
}

export async function createRoute(input: {
  conductorId: number;
  vehicleId: number;
  fechaRuta: Date;
  zona?: string;
  horaInicioProg?: string;
  horaFinProg?: string;
  estado?: RutaEstado;
}) {
  const conductor = await prisma.user.findUnique({
    where: { id: input.conductorId },
    select: { id: true, role: true, active: true },
  });

  if (!conductor) {
    const err: any = new Error("Conductor not found");
    err.status = 404;
    throw err;
  }
  if (conductor.role !== UserRole.CONDUCTOR) {
    const err: any = new Error("User is not CONDUCTOR");
    err.status = 400;
    throw err;
  }
  if (!conductor.active) {
    const err: any = new Error("Conductor is inactive");
    err.status = 400;
    throw err;
  }

  const vehicle = await prisma.vehicle.findUnique({
    where: { id: input.vehicleId },
    select: { id: true, estado: true },
  });

  if (!vehicle) {
    const err: any = new Error("Vehicle not found");
    err.status = 404;
    throw err;
  }
  if (vehicle.estado !== VehicleStatus.ACTIVO) {
    const err: any = new Error("Vehicle is not ACTIVO");
    err.status = 400;
    throw err;
  }

  const data: any = {
    conductorId: input.conductorId,
    vehicleId: input.vehicleId,
    fechaRuta: input.fechaRuta,
  };

  if (input.zona !== undefined) data.zona = input.zona.trim();
  if (input.estado !== undefined) data.estado = input.estado;
  if (input.horaInicioProg !== undefined) data.horaInicioProg = timeToDate(input.horaInicioProg);
  if (input.horaFinProg !== undefined) data.horaFinProg = timeToDate(input.horaFinProg);

  return prisma.route.create({
    data,
    include: {
      vehicle: true,
      conductor: { select: { id: true, nombre: true, email: true, role: true, active: true } },
      _count: { select: { stops: true, incidents: true } },
    },
  });
}

export async function addStopToRoute(
  routeId: number,
  input: {
    pedidoId: number;
    ordenVisita?: number;
    horaEstimada?: string;
    ventanaDesde?: string;
    ventanaHasta?: string;
    estadoParada?: ParadaEstado;
  }
) {
  const route = await prisma.route.findUnique({ where: { id: routeId }, select: { id: true } });
  if (!route) {
    const err: any = new Error("Route not found");
    err.status = 404;
    throw err;
  }

  const pedido = await prisma.pedido.findUnique({ where: { id: input.pedidoId }, select: { id: true } });
  if (!pedido) {
    const err: any = new Error("Pedido not found");
    err.status = 404;
    throw err;
  }

  const alreadyInRoute = await prisma.routeStop.findFirst({
    where: { routeId, pedidoId: input.pedidoId },
    select: { id: true },
  });
  if (alreadyInRoute) {
    const err: any = new Error("Pedido already added to this route");
    err.status = 409;
    throw err;
  }

  let ordenVisita = input.ordenVisita;
  if (ordenVisita === undefined) {
    const last = await prisma.routeStop.findFirst({
      where: { routeId },
      orderBy: { ordenVisita: "desc" },
      select: { ordenVisita: true },
    });
    ordenVisita = (last?.ordenVisita ?? 0) + 1;
  }

  const data: any = { routeId, pedidoId: input.pedidoId, ordenVisita };

  if (input.estadoParada !== undefined) data.estadoParada = input.estadoParada;
  if (input.horaEstimada !== undefined) data.horaEstimada = timeToDate(input.horaEstimada);
  if (input.ventanaDesde !== undefined) data.ventanaDesde = timeToDate(input.ventanaDesde);
  if (input.ventanaHasta !== undefined) data.ventanaHasta = timeToDate(input.ventanaHasta);

  return prisma.routeStop.create({
    data,
    include: { pedido: { include: { client: true } } },
  });
}

export async function updateStop(
  routeId: number,
  stopId: number,
  input: {
    ordenVisita?: number;
    horaEstimada?: string;
    ventanaDesde?: string;
    ventanaHasta?: string;
    estadoParada?: ParadaEstado;
    incidente?: {
      tipo: string;
      descripcion: string;
      severidad?: IncidenciaSeveridad;
    };
  },
  actor?: Actor
) {
  const stop = await prisma.routeStop.findUnique({
    where: { id: stopId },
    select: { id: true, routeId: true, pedidoId: true, estadoParada: true },
  });

  if (!stop || stop.routeId !== routeId) {
    const err: any = new Error("Stop not found in this route");
    err.status = 404;
    throw err;
  }

  if (input.incidente && !actor) {
    const err: any = new Error("Missing user context (actor) for incidente");
    err.status = 400;
    throw err;
  }

  if (actor?.role === UserRole.CONDUCTOR) {
    const route = await prisma.route.findUnique({
      where: { id: routeId },
      select: { id: true, conductorId: true },
    });
    if (!route) {
      const err: any = new Error("Route not found");
      err.status = 404;
      throw err;
    }
    if (route.conductorId !== actor.id) {
      const err: any = new Error("Forbidden");
      err.status = 403;
      throw err;
    }
  }

  const data: any = {};
  if (input.ordenVisita !== undefined) data.ordenVisita = input.ordenVisita;
  if (input.estadoParada !== undefined) data.estadoParada = input.estadoParada;
  if (input.horaEstimada !== undefined) data.horaEstimada = timeToDate(input.horaEstimada);
  if (input.ventanaDesde !== undefined) data.ventanaDesde = timeToDate(input.ventanaDesde);
  if (input.ventanaHasta !== undefined) data.ventanaHasta = timeToDate(input.ventanaHasta);

  const shouldCreateIncident =
    input.estadoParada === ParadaEstado.NO_ENTREGADA &&
    stop.estadoParada !== ParadaEstado.NO_ENTREGADA &&
    input.incidente !== undefined &&
    actor !== undefined;

  const updated = await prisma.$transaction(async (tx) => {
    const updatedStop = await tx.routeStop.update({
      where: { id: stopId },
      data,
      include: { pedido: { include: { client: true } } },
    });

        // ✅ Sincronizar estado del Pedido con el estado de la Parada
        // Esto evita que Pedidos quede "PENDIENTE" cuando ya fue entregado/no entregado en la ruta.
        if (input.estadoParada !== undefined) {
          const nextPedidoEstado =
            input.estadoParada === ParadaEstado.COMPLETADA
              ? ("ENTREGADO" as const)
              : input.estadoParada === ParadaEstado.NO_ENTREGADA
                ? ("NO_ENTREGADO" as const)
                : ("PENDIENTE" as const);

          await tx.pedido.update({
            where: { id: updatedStop.pedidoId },
            data: { estado: nextPedidoEstado },
          });
        }


    if (shouldCreateIncident) {
      await tx.incident.create({
        data: {
          routeId,
          pedidoId: stop.pedidoId,
          createdById: actor!.id,
          tipo: input.incidente!.tipo,
          descripcion: input.incidente!.descripcion,
          ...(input.incidente!.severidad !== undefined ? { severidad: input.incidente!.severidad } : {}),
        },
      });
    }

    return updatedStop;
  });

  return updated;
}

export async function deleteStop(routeId: number, stopId: number) {
  const stop = await prisma.routeStop.findUnique({
    where: { id: stopId },
    select: { id: true, routeId: true },
  });

  if (!stop || stop.routeId !== routeId) {
    const err: any = new Error("Stop not found in this route");
    err.status = 404;
    throw err;
  }

  await prisma.routeStop.delete({ where: { id: stopId } });
  return { deleted: true };
}

/**
 * Importar Excel y crear rutas automáticamente por comuna
 */
export async function importarExcelConRutas(
  buffer: Buffer,
  fechaCompromiso: Date | undefined,
  rutasConfig: Array<{
    comuna: string;
    conductorId: number;
    vehicleId: number;
  }>,
  groupBy: import("./routes.import.service").GroupByZona = "comuna"
) {
  // 1. Parsear Excel y obtener preview
  const { previewExcelRutas } = await import("./routes.import.service");
  const preview = await previewExcelRutas(buffer, groupBy);
  
  if (!preview.ok) {
    throw new Error("Error al procesar Excel");
  }

  const rutasPorComuna = preview.rutasPorComuna;
  const comunasACrear = new Map(rutasConfig.map(r => [r.comuna, r]));

  let pedidosCreados = 0;
  let detallesCreados = 0;
  let rutasCreadas = 0;
  let paradasCreadas = 0;

  // 2. Crear pedidos y rutas por cada comuna seleccionada
  for (const rutaComuna of rutasPorComuna) {
    const config = comunasACrear.get(rutaComuna.comuna);
    if (!config) continue; // Si la comuna no está seleccionada, skip

    // Validar conductor
    const conductor = await prisma.user.findUnique({
      where: { id: config.conductorId },
      select: { id: true, role: true, active: true },
    });

    if (!conductor || conductor.role !== UserRole.CONDUCTOR || !conductor.active) {
      throw new Error(`Conductor inválido para comuna ${rutaComuna.comuna}`);
    }

    // Validar vehículo
    const vehicle = await prisma.vehicle.findUnique({
      where: { id: config.vehicleId },
      select: { id: true, estado: true },
    });

    if (!vehicle || vehicle.estado !== VehicleStatus.ACTIVO) {
      throw new Error(`Vehículo inválido para comuna ${rutaComuna.comuna}`);
    }

    // Crear la ruta
    const rutaCreada = await prisma.route.create({
      data: {
        conductorId: config.conductorId,
        vehicleId: config.vehicleId,
        fechaRuta: fechaCompromiso || new Date(),
        zona: rutaComuna.comuna,
        estado: "PROGRAMADA",
      },
    });

    rutasCreadas++;

    // Crear pedidos y paradas
    let orden = 1;
    for (const cliente of rutaComuna.clientes) {
      // Crear pedido
      const pedido = await prisma.pedido.create({
        data: {
          clientId: cliente.clienteId,
          fechaCompromiso: fechaCompromiso || new Date(),
          estado: "PENDIENTE",
          cajas: cliente.totalCajas,
          comentarios: `Importado - ${rutaComuna.comuna}`,
        },
      });

      pedidosCreados++;

      // Crear detalles del pedido
      for (const producto of cliente.productos) {
        await prisma.pedidoDetalle.create({
          data: {
            pedidoId: pedido.id,
            producto: producto.codigo,
            descripcion: producto.descripcion,
            cantidad: producto.cantidad,
          },
        });
        detallesCreados++;
      }

      // Crear parada en la ruta
      await prisma.routeStop.create({
        data: {
          routeId: rutaCreada.id,
          pedidoId: pedido.id,
          ordenVisita: orden,
          estadoParada: "PENDIENTE",
        },
      });

      paradasCreadas++;
      orden++;
    }
  }

  return {
    ok: true,
    pedidosCreados,
    detallesCreados,
    rutasCreadas,
    paradasCreadas,
    resumen: {
      totalComunas: rutasCreadas,
      totalPedidos: pedidosCreados,
      totalParadas: paradasCreadas,
    },
  };
}