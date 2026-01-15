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

pedidosRouter.get(
  "/pedidos",
  authMiddleware,
  requireRoles("ADMIN", "PLANIFICADOR", "SUPERVISOR"),
  handleListPedidos
);

pedidosRouter.post(
  "/pedidos",
  authMiddleware,
  requireRoles("ADMIN", "PLANIFICADOR"),
  handleCreatePedido
);

pedidosRouter.patch(
  "/pedidos/:id",
  authMiddleware,
  requireRoles("ADMIN", "PLANIFICADOR", "SUPERVISOR"),
  handleUpdatePedido
);

pedidosRouter.delete(
  "/pedidos/:id",
  authMiddleware,
  requireRoles("ADMIN", "PLANIFICADOR", "SUPERVISOR"),
  handleDeletePedido
);
