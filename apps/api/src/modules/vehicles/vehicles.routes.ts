import { Router } from "express";
import { authMiddleware } from "../../middlewares/auth.middleware";
import { requireRoles } from "../../middlewares/roles.middleware";
import {
  handleCreateVehicle,
  handleListVehicles,
  handleUpdateVehicle,
} from "./vehicles.controller";

export const vehiclesRouter = Router();

vehiclesRouter.get(
  "/vehicles",
  authMiddleware,
  requireRoles("ADMIN", "PLANIFICADOR", "SUPERVISOR"),
  handleListVehicles
);

vehiclesRouter.post(
  "/vehicles",
  authMiddleware,
  requireRoles("ADMIN", "PLANIFICADOR"),
  handleCreateVehicle
);

vehiclesRouter.patch(
  "/vehicles/:id",
  authMiddleware,
  requireRoles("ADMIN", "PLANIFICADOR"),
  handleUpdateVehicle
);
