import { Router } from "express";
import { authMiddleware } from "../../middlewares/auth.middleware";
import { requireRoles } from "../../middlewares/roles.middleware";
import {
  handleCreateIncident,
  handleListIncidents,
  handleUpdateIncident,
  handleCountPending,
  handleGetIncident,
  handleReviewIncident,
} from "./incidents.controller";

export const incidentsRouter = Router();

incidentsRouter.get(
  "/incidents/pending/count",
  authMiddleware,
  requireRoles("ADMIN", "SUPERVISOR"),
  handleCountPending
);

incidentsRouter.get(
  "/incidents",
  authMiddleware,
  requireRoles("ADMIN", "PLANIFICADOR", "SUPERVISOR", "CONDUCTOR"),
  handleListIncidents
);

incidentsRouter.get(
  "/incidents/:id",
  authMiddleware,
  requireRoles("ADMIN", "PLANIFICADOR", "SUPERVISOR", "CONDUCTOR"),
  handleGetIncident
);

incidentsRouter.post(
  "/incidents",
  authMiddleware,
  requireRoles("ADMIN", "PLANIFICADOR", "SUPERVISOR", "CONDUCTOR"),
  handleCreateIncident
);

incidentsRouter.post(
  "/incidents/:id/review",
  authMiddleware,
  requireRoles("ADMIN", "SUPERVISOR"),
  handleReviewIncident
);

incidentsRouter.patch(
  "/incidents/:id",
  authMiddleware,
  requireRoles("ADMIN", "PLANIFICADOR", "SUPERVISOR"),
  handleUpdateIncident
);
