import { Router } from "express";
import multer from "multer";
import {
  handleCreateClient,
  handleListClients,
  handleImportClients,
  handleUpdateClient,
  handleGetClient,  // ← AGREGADO
} from "./clients.controller";

import { authMiddleware } from "../../middlewares/auth.middleware";
import { requireRoles } from "../../middlewares/roles.middleware";

export const clientsRouter = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
});

clientsRouter.get("/clients", handleListClients);
clientsRouter.get("/clients/:id", handleGetClient);  // ← AGREGADO
clientsRouter.post("/clients", handleCreateClient);
clientsRouter.patch("/clients/:id", handleUpdateClient);

// ✅ Protegido: solo ADMIN / PLANIFICADOR / SUPERVISOR
clientsRouter.post(
  "/clients/import",
  authMiddleware,
  requireRoles("ADMIN", "PLANIFICADOR", "SUPERVISOR"),
  upload.single("file"),
  handleImportClients
);