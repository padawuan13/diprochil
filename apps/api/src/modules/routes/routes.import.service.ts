/**
 * Servicio de importación de Excel de rutas
 */

import * as XLSX from "xlsx";
import { prisma } from "../../lib/prisma";

interface FilaExcel {
  [key: string]: any;
}

export interface ClienteAgrupado {
  rut: string;
  clienteId: number;
  nombre: string;
  comuna: string;
  latitud: number;
  longitud: number;
  productos: {
    codigo: string;
    descripcion: string;
    cantidad: number;
  }[];
  totalCajas: number;
}

export interface RutaPorComuna {
  comuna: string;
  clientes: ClienteAgrupado[];
  totalClientes: number;
  totalCajas: number;
}

export type GroupByZona = "comuna" | "ciudad";

/**
 * Detectar nombres de columnas (flexible)
 */
function obtenerValorColumna(fila: FilaExcel, posiblesNombres: string[]): any {
  for (const nombre of posiblesNombres) {
    if (fila[nombre] !== undefined && fila[nombre] !== null && fila[nombre] !== "") {
      return fila[nombre];
    }
  }
  
  // Búsqueda parcial (para columnas truncadas)
  for (const nombre of posiblesNombres) {
    const encontrada = Object.keys(fila).find(key => key.includes(nombre.substring(0, 10)));
    if (encontrada && fila[encontrada] !== undefined && fila[encontrada] !== null && fila[encontrada] !== "") {
      return fila[encontrada];
    }
  }
  
  return null;
}

function parsearExcel(buffer: Buffer): Map<string, FilaExcel[]> {
  const workbook = XLSX.read(buffer, { type: "buffer" });
  const sheetName = workbook.SheetNames[0];
  if (!sheetName) {
    throw new Error("Excel no tiene hojas");
  }
  const worksheet = workbook.Sheets[sheetName];
  if (!worksheet) {
    throw new Error("Hoja de Excel no encontrada");
  }

  const data = XLSX.utils.sheet_to_json(worksheet, {
    range: 5, // Comenzar desde la fila 6 (índice 5)
    defval: "",
  }) as FilaExcel[];

  console.log("📊 Total de filas leídas:", data.length);
  console.log("📋 Primera fila (ejemplo):", data[0]);
  console.log("🔑 Columnas disponibles:", data[0] ? Object.keys(data[0]) : "Sin datos");

  const dataLimpia = data.filter((fila) => {
    const rut = obtenerValorColumna(fila, [
      "Cod.Cliente", 
      "RutCliente", 
      "RUT", 
      "Rut Cliente",
      "Cod Cliente", 
      "Cliente"
    ]);
    return rut !== null && rut !== "";
  });

  console.log("✅ Filas con RUT válido:", dataLimpia.length);

  const agrupadoPorRut = new Map<string, FilaExcel[]>();

  dataLimpia.forEach((fila) => {
    const rut = String(obtenerValorColumna(fila, [
      "Cod.Cliente", 
      "RutCliente", 
      "RUT", 
      "Rut Cliente",
      "Cod Cliente",
      "Cliente"
    ]) || "").trim();
    if (!rut) return;
    
    if (!agrupadoPorRut.has(rut)) {
      agrupadoPorRut.set(rut, []);
    }
    const grupo = agrupadoPorRut.get(rut);
    if (grupo !== undefined) {
      grupo.push(fila);
    }
  });

  return agrupadoPorRut;
}

async function buscarYAgruparPorZona(
  agrupadoPorRut: Map<string, FilaExcel[]>,
  groupBy: GroupByZona
): Promise<{
  rutasPorComuna: RutaPorComuna[];
  clientesNoEncontrados: string[];
  clientesSinCoordenadas: string[];
  groupBy: GroupByZona;
}> {
  const ruts = Array.from(agrupadoPorRut.keys());

  const clientes = await prisma.client.findMany({
    where: { rut: { in: ruts } },
    select: {
      id: true,
      rut: true,
      razonSocial: true,
      comuna: true,
      ciudad: true,
      latitud: true,
      longitud: true,
    },
  });

  const clientesPorRut = new Map(clientes.map((c) => [c.rut, c]));
  const clientesNoEncontrados = ruts.filter((rut) => !clientesPorRut.has(rut));
  const agrupadoPorComuna = new Map<string, ClienteAgrupado[]>();
  const clientesSinCoordenadas: string[] = [];

  agrupadoPorRut.forEach((productos, rut) => {
    const cliente = clientesPorRut.get(rut);
    if (!cliente) return;

    if (!cliente.latitud || !cliente.longitud) {
      clientesSinCoordenadas.push(`${rut} - ${cliente.razonSocial}`);
      return;
    }

    const zona = groupBy === "ciudad" ? cliente.ciudad : cliente.comuna;
    if (!agrupadoPorComuna.has(zona)) {
      agrupadoPorComuna.set(zona, []);
    }

    const clienteAgrupado: ClienteAgrupado = {
      rut,
      clienteId: cliente.id,
      nombre: cliente.razonSocial,
      comuna: zona,
      latitud: cliente.latitud,
      longitud: cliente.longitud,
      productos: productos.map((p) => ({
        codigo: String(obtenerValorColumna(p, [
          "Producto", 
          "Cod.Producto", 
          "CodProducto",
          "Cod Producto"
        ]) || "").trim(),
        descripcion: String(obtenerValorColumna(p, [
          "Descripción Producto", 
          "Descripcion", 
          "Producto Descripcion",
          "Descripción P", 
          "Descripcion P"
        ]) || "").trim(),
        cantidad: Number(obtenerValorColumna(p, [
          "Pedido", 
          "Cantidad", 
          "Cajas"
        ]) || 0),
      })),
      totalCajas: productos.reduce((sum, p) => {
        const cantidad = Number(obtenerValorColumna(p, [
          "Pedido", 
          "Cantidad", 
          "Cajas"
        ]) || 0);
        return sum + cantidad;
      }, 0),
    };

    const grupo = agrupadoPorComuna.get(zona);
    if (grupo !== undefined) {
      grupo.push(clienteAgrupado);
    }
  });

  const rutasPorComuna: RutaPorComuna[] = Array.from(
    agrupadoPorComuna.entries()
  ).map(([comuna, clientes]) => ({
    comuna,
    clientes,
    totalClientes: clientes.length,
    totalCajas: clientes.reduce((sum, c) => sum + c.totalCajas, 0),
  }));

  rutasPorComuna.sort((a, b) => b.totalClientes - a.totalClientes);

  return { rutasPorComuna, clientesNoEncontrados, clientesSinCoordenadas, groupBy };
}

async function crearPedidos(
  rutasPorComuna: RutaPorComuna[],
  fechaCompromiso?: Date
): Promise<{ pedidosCreados: number; detallesCreados: number }> {
  let pedidosCreados = 0;
  let detallesCreados = 0;

  for (const ruta of rutasPorComuna) {
    for (const cliente of ruta.clientes) {
      const pedidoCreado = await prisma.pedido.create({
        data: {
          clientId: cliente.clienteId,
          fechaCompromiso: fechaCompromiso || new Date(),
          estado: "PENDIENTE",
          cajas: cliente.totalCajas,
          comentarios: `Importado desde Excel - ${ruta.comuna}`,
        },
      });

      for (const producto of cliente.productos) {
        await prisma.pedidoDetalle.create({
          data: {
            pedidoId: pedidoCreado.id,
            producto: producto.codigo,
            descripcion: producto.descripcion,
            cantidad: producto.cantidad,
          },
        });
        detallesCreados++;
      }

      pedidosCreados++;
    }
  }

  return { pedidosCreados, detallesCreados };
}

export async function importarExcelRutas(
  buffer: Buffer,
  fechaCompromiso?: Date,
  groupBy: GroupByZona = "comuna"
) {
  const agrupadoPorRut = parsearExcel(buffer);
  const { rutasPorComuna, clientesNoEncontrados, clientesSinCoordenadas } =
    await buscarYAgruparPorZona(agrupadoPorRut, groupBy);
  const { pedidosCreados, detallesCreados } = await crearPedidos(
    rutasPorComuna,
    fechaCompromiso
  );

  const resumen = {
    totalComunas: rutasPorComuna.length,
    totalClientes: rutasPorComuna.reduce((sum, r) => sum + r.totalClientes, 0),
    totalCajas: rutasPorComuna.reduce((sum, r) => sum + r.totalCajas, 0),
  };

  return {
    ok: true,
    rutasPorComuna,
    rutasAgrupadas: rutasPorComuna,
    groupBy,
    pedidosCreados,
    detallesCreados,
    clientesNoEncontrados,
    clientesSinCoordenadas,
    resumen,
  };
}

export async function previewExcelRutas(
  buffer: Buffer,
  groupBy: GroupByZona = "comuna"
) {
  const agrupadoPorRut = parsearExcel(buffer);
  const { rutasPorComuna, clientesNoEncontrados, clientesSinCoordenadas } =
    await buscarYAgruparPorZona(agrupadoPorRut, groupBy);

  const resumen = {
    totalComunas: rutasPorComuna.length,
    totalClientes: rutasPorComuna.reduce((sum, r) => sum + r.totalClientes, 0),
    totalCajas: rutasPorComuna.reduce((sum, r) => sum + r.totalCajas, 0),
  };

  return {
    ok: true,
    rutasPorComuna,
    rutasAgrupadas: rutasPorComuna,
    groupBy,
    clientesNoEncontrados,
    clientesSinCoordenadas,
    resumen,
  };
}