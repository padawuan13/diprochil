import { Router } from "express";
import { authMiddleware } from "../../middlewares/auth.middleware";
import { requireRoles } from "../../middlewares/roles.middleware";
import {
  handleCreatePedido,
  handleDeletePedido,
  handleListPedidos,
  handleUpdatePedido,
} from "./pedidos.controller";

export const pedidosRouter = Router();

// Listar: ADMIN / PLANIFICADOR / SUPERVISOR
pedidosRouter.get(
  "/pedidos",
  authMiddleware,
  requireRoles("ADMIN", "PLANIFICADOR", "SUPERVISOR"),
  handleListPedidos
);

// Crear: ADMIN / PLANIFICADOR
pedidosRouter.post(
  "/pedidos",
  authMiddleware,
  requireRoles("ADMIN", "PLANIFICADOR"),
  handleCreatePedido
);

// Actualizar: ADMIN / PLANIFICADOR / SUPERVISOR
pedidosRouter.patch(
  "/pedidos/:id",
  authMiddleware,
  requireRoles("ADMIN", "PLANIFICADOR", "SUPERVISOR"),
  handleUpdatePedido
);

// Eliminar: ADMIN / PLANIFICADOR / SUPERVISOR (CONDUCTOR NO)
pedidosRouter.delete(
  "/pedidos/:id",
  authMiddleware,
  requireRoles("ADMIN", "PLANIFICADOR", "SUPERVISOR"),
  handleDeletePedido
);
