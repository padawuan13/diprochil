import { Router } from "express";
import { exportPedidos, exportRutas } from "./exports.controller";
import { authMiddleware } from "../../middlewares/auth.middleware";
import { requireRoles } from "../../middlewares/role.middleware";

const router = Router();

router.get(
  "/pedidos",
  authMiddleware,
  requireRoles("ADMIN", "PLANIFICADOR", "SUPERVISOR"),
  exportPedidos
);

router.get(
  "/rutas",
  authMiddleware,
  requireRoles("ADMIN", "PLANIFICADOR", "SUPERVISOR"),
  exportRutas
);

export default router;
