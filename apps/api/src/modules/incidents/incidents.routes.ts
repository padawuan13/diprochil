import { Router } from "express";
import { authMiddleware } from "../../middlewares/auth.middleware";
import { requireRoles } from "../../middlewares/roles.middleware";
import { handleCreateIncident, handleListIncidents, handleUpdateIncident } from "./incidents.controller";

export const incidentsRouter = Router();

// Listado: ADMIN / PLANIFICADOR / SUPERVISOR
incidentsRouter.get(
  "/incidents",
  authMiddleware,
  requireRoles("ADMIN", "PLANIFICADOR", "SUPERVISOR"),
  handleListIncidents
);

// Crear: ADMIN / PLANIFICADOR / SUPERVISOR / CONDUCTOR
incidentsRouter.post(
  "/incidents",
  authMiddleware,
  requireRoles("ADMIN", "PLANIFICADOR", "SUPERVISOR", "CONDUCTOR"),
  handleCreateIncident
);

// Actualizar (ej cerrar): ADMIN / PLANIFICADOR / SUPERVISOR
incidentsRouter.patch(
  "/incidents/:id",
  authMiddleware,
  requireRoles("ADMIN", "PLANIFICADOR", "SUPERVISOR"),
  handleUpdateIncident
);
