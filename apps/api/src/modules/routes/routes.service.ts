import { prisma } from "../../lib/prisma";
import { UserRole, VehicleStatus, ParadaEstado, RutaEstado as RutaEstadoEnum } from "@prisma/client";
import type { RutaEstado, UserRole as UserRoleType } from "@prisma/client";

export async function cleanupOldRoutes() {
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  try {
    await prisma.routeStop.deleteMany({
      where: {
        route: {
          estado: { in: [RutaEstadoEnum.FINALIZADA, RutaEstadoEnum.CANCELADA] },
          updatedAt: { lt: sevenDaysAgo },
        },
      },
    });

    await prisma.incident.deleteMany({
      where: {
        route: {
          estado: { in: [RutaEstadoEnum.FINALIZADA, RutaEstadoEnum.CANCELADA] },
          updatedAt: { lt: sevenDaysAgo },
        },
      },
    });

    const deleted = await prisma.route.deleteMany({
      where: {
        estado: { in: [RutaEstadoEnum.FINALIZADA, RutaEstadoEnum.CANCELADA] },
        updatedAt: { lt: sevenDaysAgo },
      },
    });

    if (deleted.count > 0) {
      console.log(`🧹 Auto-limpieza: ${deleted.count} rutas antiguas eliminadas`);
    }

    return deleted.count;
  } catch (error) {
    console.error("Error en auto-limpieza de rutas:", error);
    return 0;
  }
}

type Actor = { id: number; role: UserRoleType };

function timeToDate(t: string): Date {
  const tt = t.length === 5 ? `${t}:00` : t;
  return new Date(`1970-01-01T${tt}.000Z`);
}

export async function getConductoresConCarga(fecha: Date) {
  const conductores = await prisma.user.findMany({
    where: {
      role: UserRole.CONDUCTOR,
      active: true,
    },
    select: {
      id: true,
      nombre: true,
      email: true,
    },
  });

  const fechaInicio = new Date(fecha);
  fechaInicio.setUTCHours(0, 0, 0, 0);
  const fechaFin = new Date(fecha);
  fechaFin.setUTCHours(23, 59, 59, 999);

  const conductoresConCarga = await Promise.all(
    conductores.map(async (conductor) => {
      const rutas = await prisma.route.findMany({
        where: {
          conductorId: conductor.id,
          fechaRuta: { gte: fechaInicio, lte: fechaFin },
          estado: { notIn: [RutaEstadoEnum.CANCELADA] },
        },
        include: {
          _count: { select: { stops: true } },
        },
      });

      const totalRutas = rutas.length;
      const totalParadas = rutas.reduce((sum, r) => sum + r._count.stops, 0);

      return {
        ...conductor,
        totalRutas,
        totalParadas,
        carga: totalParadas * 10 + totalRutas,
      };
    })
  );

  conductoresConCarga.sort((a, b) => a.carga - b.carga);

  return conductoresConCarga;
}

export async function autoAsignarConductor(fecha: Date, zona?: string) {
  const conductores = await getConductoresConCarga(fecha);

  if (conductores.length === 0) {
    return null;
  }

  if (zona) {
    const fechaInicio = new Date(fecha);
    fechaInicio.setUTCHours(0, 0, 0, 0);
    const fechaFin = new Date(fecha);
    fechaFin.setUTCHours(23, 59, 59, 999);

    const rutaExistenteZona = await prisma.route.findFirst({
      where: {
        zona: zona,
        fechaRuta: { gte: fechaInicio, lte: fechaFin },
        estado: { notIn: [RutaEstadoEnum.CANCELADA, RutaEstadoEnum.FINALIZADA] },
      },
      select: { conductorId: true, vehicleId: true, id: true },
    });

    if (rutaExistenteZona) {
      return {
        conductorId: rutaExistenteZona.conductorId,
        vehicleId: rutaExistenteZona.vehicleId,
        rutaExistenteId: rutaExistenteZona.id,
        razon: "ruta_existente_zona",
      };
    }
  }

  const primerConductor = conductores[0];
if (!primerConductor) return null; 
return {
  conductorId: primerConductor.id,
  vehicleId: null,
  rutaExistenteId: null,
  razon: "menor_carga",
};
}

export async function getVehiculosDisponibles(fecha: Date) {
  const vehiculos = await prisma.vehicle.findMany({
    where: { estado: VehicleStatus.ACTIVO },
    select: { id: true, patente: true, tipo: true },
  });

  const fechaInicio = new Date(fecha);
  fechaInicio.setUTCHours(0, 0, 0, 0);
  const fechaFin = new Date(fecha);
  fechaFin.setUTCHours(23, 59, 59, 999);

  const rutasDelDia = await prisma.route.findMany({
    where: {
      fechaRuta: { gte: fechaInicio, lte: fechaFin },
      estado: { notIn: [RutaEstadoEnum.CANCELADA] },
    },
    select: { vehicleId: true },
  });

  const vehiculosUsados = new Set(rutasDelDia.map(r => r.vehicleId));

  const disponibles = vehiculos.filter(v => !vehiculosUsados.has(v.id));
  const enUso = vehiculos.filter(v => vehiculosUsados.has(v.id));

  return { disponibles, enUso, todos: vehiculos };
}

export async function autoAsignarConductorYVehiculo(fecha: Date, zona?: string) {
  const asignacion = await autoAsignarConductor(fecha, zona);

  if (!asignacion) {
    return null;
  }

  if (asignacion.vehicleId) {
    return asignacion;
  }

  const fechaInicio = new Date(fecha);
  fechaInicio.setUTCHours(0, 0, 0, 0);
  const fechaFin = new Date(fecha);
  fechaFin.setUTCHours(23, 59, 59, 999);

  const rutaConductor = await prisma.route.findFirst({
    where: {
      conductorId: asignacion.conductorId,
      fechaRuta: { gte: fechaInicio, lte: fechaFin },
      estado: { notIn: [RutaEstadoEnum.CANCELADA] },
    },
    select: { vehicleId: true },
  });

  if (rutaConductor) {
    return { ...asignacion, vehicleId: rutaConductor.vehicleId };
  }

  const { disponibles } = await getVehiculosDisponibles(fecha);

  const primerVehiculo = disponibles[0];
if (primerVehiculo) {
  return { ...asignacion, vehicleId: primerVehiculo.id };
}

  const todosVehiculos = await prisma.vehicle.findFirst({
    where: { estado: VehicleStatus.ACTIVO },
    select: { id: true },
  });

  return { ...asignacion, vehicleId: todosVehiculos?.id || null };
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
  cleanupOldRoutes().catch(() => {});

  const where: any = {};

  if (params.estado) where.estado = params.estado;
  if (params.conductorId) where.conductorId = params.conductorId;
  if (params.vehicleId) where.vehicleId = params.vehicleId;

  if (params.dateFrom || params.dateTo) {
    where.fechaRuta = {};
    if (params.dateFrom) {
      const fromDate = new Date(params.dateFrom);
      fromDate.setUTCHours(0, 0, 0, 0);
      where.fechaRuta.gte = fromDate;
    }
    if (params.dateTo) {
      const toDate = new Date(params.dateTo);
      toDate.setUTCHours(23, 59, 59, 999);
      where.fechaRuta.lte = toDate;
    }
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
          estado: "ABIERTA",
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

export async function deleteRoute(routeId: number, deletePedidos: boolean = false) {
  const route = await prisma.route.findUnique({
    where: { id: routeId },
    include: {
      stops: { select: { id: true, pedidoId: true } },
      incidents: { select: { id: true } },
    },
  });

  if (!route) {
    const err: any = new Error("Route not found");
    err.status = 404;
    throw err;
  }

  await prisma.$transaction(async (tx) => {
    const pedidoIds = route.stops.map(s => s.pedidoId);

    await tx.incident.deleteMany({ where: { routeId } });
    await tx.routeStop.deleteMany({ where: { routeId } });
    await tx.route.delete({ where: { id: routeId } });

    if (deletePedidos && pedidoIds.length > 0) {
      await tx.pedidoDetalle.deleteMany({
        where: { pedidoId: { in: pedidoIds } },
      });
      await tx.pedido.deleteMany({
        where: { id: { in: pedidoIds } },
      });
    }
  });

  return {
    deleted: true,
    stopsDeleted: route.stops.length,
    incidentsDeleted: route.incidents.length,
    pedidosDeleted: deletePedidos ? route.stops.length : 0,
  };
}

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

  for (const rutaComuna of rutasPorComuna) {
    const config = comunasACrear.get(rutaComuna.comuna);
    if (!config) continue;

    const conductor = await prisma.user.findUnique({
      where: { id: config.conductorId },
      select: { id: true, role: true, active: true },
    });

    if (!conductor || conductor.role !== UserRole.CONDUCTOR || !conductor.active) {
      throw new Error(`Conductor inválido para comuna ${rutaComuna.comuna}`);
    }

    const vehicle = await prisma.vehicle.findUnique({
      where: { id: config.vehicleId },
      select: { id: true, estado: true },
    });

    if (!vehicle || vehicle.estado !== VehicleStatus.ACTIVO) {
      throw new Error(`Vehículo inválido para comuna ${rutaComuna.comuna}`);
    }

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

    let orden = 1;
    for (const cliente of rutaComuna.clientes) {
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