import { Router } from "express";
import { authMiddleware } from "../../middlewares/auth.middleware";
import { requireRoles } from "../../middlewares/roles.middleware";
import {
  handleCreateVehicle,
  handleListVehicles,
  handleUpdateVehicle,
} from "./vehicles.controller";

export const vehiclesRouter = Router();

// Listar: ADMIN / PLANIFICADOR / SUPERVISOR
vehiclesRouter.get(
  "/vehicles",
  authMiddleware,
  requireRoles("ADMIN", "PLANIFICADOR", "SUPERVISOR"),
  handleListVehicles
);

// Crear: ADMIN / PLANIFICADOR
vehiclesRouter.post(
  "/vehicles",
  authMiddleware,
  requireRoles("ADMIN", "PLANIFICADOR"),
  handleCreateVehicle
);

// Editar: ADMIN / PLANIFICADOR
vehiclesRouter.patch(
  "/vehicles/:id",
  authMiddleware,
  requireRoles("ADMIN", "PLANIFICADOR"),
  handleUpdateVehicle
);
