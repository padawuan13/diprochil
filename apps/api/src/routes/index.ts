import { Router } from "express";
import { healthRouter } from "./health.routes";
import { authRouter } from "../modules/auth/auth.routes";
import { usersRouter } from "../modules/users/users.routes";
import { clientsRouter } from "../modules/clients/clients.routes";
import { vehiclesRouter } from "../modules/vehicles/vehicles.routes";
import { pedidosRouter } from "../modules/pedidos/pedidos.routes";
import { routesRouter } from "../modules/routes/routes.routes";
import { incidentsRouter } from "../modules/incidents/incidents.routes";

export const routes = Router();

routes.use(healthRouter);
routes.use(authRouter);
routes.use(usersRouter);
routes.use(clientsRouter);
routes.use(vehiclesRouter);
routes.use(pedidosRouter);
routes.use(routesRouter);
routes.use(incidentsRouter);
