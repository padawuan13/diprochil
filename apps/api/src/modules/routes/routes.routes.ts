import { Router } from "express";
import { authMiddleware } from "../../middlewares/auth.middleware";
import { requireRoles } from "../../middlewares/roles.middleware";
import {
  handleAddStop,
  handleCreateRoute,
  handleDeleteStop,
  handleGetRoute,
  handleListRoutes,
  handleUpdateStop,
  handleImportExcelConRutas,
} from "./routes.controller";
import { handleRouteDashboard } from "./routes.dashboard.controller";
import { handleMyRoutes } from "./routes.my.controller"; 
import { handleUpdateRouteStatus } from "./routes.status.controller";
import multer from "multer";
import {
  handleOptimizeRoute,
  handlePreviewImportExcel,
  handleImportExcel,
} from "./routes.controller";

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
});

export const routesRouter = Router();

// Rutas
routesRouter.get(
  "/routes",
  authMiddleware,
  requireRoles("ADMIN", "PLANIFICADOR", "SUPERVISOR"),
  handleListRoutes
);

routesRouter.get(
  "/routes/my",
  authMiddleware,
  requireRoles("CONDUCTOR"),
  handleMyRoutes
);

// POST /routes/optimize - Preview de optimización
routesRouter.post(
  "/routes/optimize",
  authMiddleware,
  requireRoles("ADMIN", "PLANIFICADOR", "SUPERVISOR"),
  handleOptimizeRoute
);

// POST /routes/import/preview - Preview de importación (no guarda)
routesRouter.post(
  "/routes/import/preview",
  authMiddleware,
  requireRoles("ADMIN", "PLANIFICADOR", "SUPERVISOR"),
  upload.single("file"),
  handlePreviewImportExcel
);

// POST /routes/import - Importar Excel y crear pedidos
routesRouter.post(
  "/routes/import",
  authMiddleware,
  requireRoles("ADMIN", "PLANIFICADOR", "SUPERVISOR"),
  upload.single("file"),
  handleImportExcel
);

routesRouter.get(
  "/routes/:id/dashboard",
  authMiddleware,
  requireRoles("ADMIN", "PLANIFICADOR", "SUPERVISOR", "CONDUCTOR"),
  handleRouteDashboard
);

routesRouter.patch(
  "/routes/:id/status",
  authMiddleware,
  requireRoles("ADMIN", "PLANIFICADOR", "SUPERVISOR", "CONDUCTOR"),
  handleUpdateRouteStatus
);

routesRouter.get(
  "/routes/:id",
  authMiddleware,
  requireRoles("ADMIN", "PLANIFICADOR", "SUPERVISOR"),
  handleGetRoute
);

routesRouter.post(
  "/routes",
  authMiddleware,
  requireRoles("ADMIN", "PLANIFICADOR", "SUPERVISOR"),
  handleCreateRoute
);

// POST /routes/import-with-routes - Importar Excel y crear rutas automáticas
routesRouter.post(
  "/routes/import-with-routes",
  authMiddleware,
  requireRoles("ADMIN", "PLANIFICADOR", "SUPERVISOR"),
  upload.single("file"),
  handleImportExcelConRutas  
);

// Paradas
routesRouter.post(
  "/routes/:id/stops",
  authMiddleware,
  requireRoles("ADMIN", "PLANIFICADOR", "SUPERVISOR"),
  handleAddStop
);

routesRouter.patch(
  "/routes/:id/stops/:stopId",
  authMiddleware,
  requireRoles("ADMIN", "PLANIFICADOR", "SUPERVISOR", "CONDUCTOR"),
  handleUpdateStop
);

routesRouter.delete(
  "/routes/:id/stops/:stopId",
  authMiddleware,
  requireRoles("ADMIN", "PLANIFICADOR", "SUPERVISOR"),
  handleDeleteStop
);
