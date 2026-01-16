import { Router } from "express";
import multer from "multer";
import {
  handleCreateClient,
  handleListClients,
  handleImportClients,
  handleUpdateClient,
  handleGetClient,
} from "./clients.controller";

import { authMiddleware } from "../../middlewares/auth.middleware";
import { requireRoles } from "../../middlewares/roles.middleware";

export const clientsRouter = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, 
});

clientsRouter.get(
  "/clients",
  authMiddleware,
  requireRoles("ADMIN", "PLANIFICADOR", "SUPERVISOR", "CONDUCTOR"),
  handleListClients
);

clientsRouter.get(
  "/clients/:id",
  authMiddleware,
  requireRoles("ADMIN", "PLANIFICADOR", "SUPERVISOR", "CONDUCTOR"),
  handleGetClient
);

clientsRouter.post(
  "/clients",
  authMiddleware,
  requireRoles("ADMIN", "PLANIFICADOR", "SUPERVISOR"),
  handleCreateClient
);

clientsRouter.patch(
  "/clients/:id",
  authMiddleware,
  requireRoles("ADMIN", "PLANIFICADOR", "SUPERVISOR", "CONDUCTOR"),
  handleUpdateClient
);

clientsRouter.post(
  "/clients/import",
  authMiddleware,
  requireRoles("ADMIN", "PLANIFICADOR", "SUPERVISOR"),
  upload.single("file"),
  handleImportClients
);