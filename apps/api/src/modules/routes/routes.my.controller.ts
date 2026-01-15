import type { Request, Response } from "express";
import { prisma } from "../../lib/prisma";

function pad2(n: number) {
  return String(n).padStart(2, "0");
}

function todayLocalYYYYMMDD() {
  const d = new Date();
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

function normalizeDateParam(dateStr?: string) {
  if (!dateStr) return todayLocalYYYYMMDD();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return null;
  return dateStr;
}

export async function handleMyRoutes(req: Request, res: Response) {
  const user = (req as any).user as { id: number; role: string } | undefined;
  if (!user) return res.status(401).json({ ok: false, message: "Unauthorized" });

  const dateStr = typeof req.query.date === "string" ? req.query.date : undefined;
  const yyyyMmDd = normalizeDateParam(dateStr);

  if (!yyyyMmDd) {
    return res.status(400).json({
      ok: false,
      message: "Invalid date. Use format YYYY-MM-DD",
    });
  }

  const fechaInicio = new Date(`${yyyyMmDd}T00:00:00.000Z`);
  const fechaFin = new Date(`${yyyyMmDd}T23:59:59.999Z`);

  console.log(`🚚 [/routes/my] Conductor ID: ${user.id}, Fecha: ${yyyyMmDd}`);
  console.log(`   Rango búsqueda: ${fechaInicio.toISOString()} - ${fechaFin.toISOString()}`);

  const routes = await prisma.route.findMany({
    where: {
      conductorId: user.id,
      fechaRuta: {
        gte: fechaInicio,
        lte: fechaFin,
      },
    },
    orderBy: { id: "desc" },
    include: {
      vehicle: true,
      stops: {
        orderBy: { ordenVisita: "asc" },
        include: {
          pedido: {
            include: {
              client: true,
            },
          },
        },
      },
    },
  });

  const totalStops = routes.reduce((acc, r) => acc + r.stops.length, 0);
  const totalCajas = routes.reduce((acc, r) => {
    return (
      acc +
      r.stops.reduce((a2, s) => a2 + (s.pedido?.cajas ?? 0), 0)
    );
  }, 0);

  console.log(`   Rutas encontradas: ${routes.length}`);
  routes.forEach(r => {
    console.log(`   - Ruta #${r.id}: fecha=${r.fechaRuta.toISOString()}, zona=${r.zona}, estado=${r.estado}`);
  });

  return res.json({
    ok: true,
    date: yyyyMmDd,
    items: routes,
    total: routes.length,
    summary: { totalStops, totalCajas },
  });
}
