import { Request, Response } from "express";
import ExcelJS from "exceljs";
import { prisma } from "../../lib/prisma"; 

// ==========================
// Exportar pedidos vencidos
// ==========================
export const exportPedidos = async (req: Request, res: Response) => {
  try {
    const pedidos = await prisma.pedido.findMany({
      include: { client: true },
    });

    const hoy = new Date();
    const vencidos = pedidos.filter(
      (p) => p.fechaCompromiso && new Date(p.fechaCompromiso) < hoy
    );

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet(
      `PedidosVencidos_${new Date().toISOString().slice(0, 10)}`
    );

    sheet.columns = [
      { header: "ID Pedido", key: "id", width: 10 },
      { header: "Cliente", key: "cliente", width: 30 },
      { header: "Fecha Compromiso", key: "fechaCompromiso", width: 20 },
      { header: "Estado", key: "estado", width: 15 },
      { header: "Cajas", key: "cajas", width: 10 },
      { header: "Comentarios", key: "comentarios", width: 40 },
    ];

    vencidos.forEach((p) =>
      sheet.addRow({
        id: p.id,
        cliente: p.client?.razonSocial ?? "N/A",
        fechaCompromiso: p.fechaCompromiso
          ? p.fechaCompromiso.toISOString().slice(0, 10)
          : "N/A",
        estado: p.estado,
        cajas: p.cajas ?? 0,
        comentarios: p.comentarios ?? "",
      })
    );

    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.setHeader(
      "Content-Disposition",
      'attachment; filename="pedidos_vencidos.xlsx"'
    );

    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    console.error("Error exportPedidos:", error);
    res
      .status(500)
      .json({ ok: false, message: "Error generando el Excel de pedidos" });
  }
};

// ==========================
// Exportar rutas finalizadas
// ==========================
export const exportRutas = async (req: Request, res: Response) => {
  try {
    const rutas = await prisma.route.findMany({
      include: { vehicle: true, conductor: true },
    });

    const finalizadas = rutas.filter((r) => r.estado === "FINALIZADA");

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet(
      `RutasFinalizadas_${new Date().toISOString().slice(0, 10)}`
    );

    sheet.columns = [
      { header: "ID Ruta", key: "id", width: 10 },
      { header: "Fecha", key: "fechaRuta", width: 15 },
      { header: "Zona", key: "zona", width: 25 },
      { header: "Conductor", key: "conductor", width: 25 },
      { header: "Vehículo", key: "vehiculo", width: 25 },
      { header: "Estado", key: "estado", width: 15 },
    ];

    finalizadas.forEach((r) =>
      sheet.addRow({
        id: r.id,
        fechaRuta: r.fechaRuta.toISOString().slice(0, 10),
        zona: r.zona ?? "N/A",
        conductor: r.conductor?.nombre ?? "N/A",
        vehiculo: r.vehicle?.patente ?? "N/A",
        estado: r.estado,
      })
    );

    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.setHeader(
      "Content-Disposition",
      'attachment; filename="rutas_finalizadas.xlsx"'
    );

    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    console.error("Error exportRutas:", error);
    res
      .status(500)
      .json({ ok: false, message: "Error generando el Excel de rutas" });
  }
};
