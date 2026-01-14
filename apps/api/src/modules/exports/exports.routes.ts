import { Router } from "express";
import { exportPedidos, exportRutas } from "./exports.controller";

const router = Router();

router.get("/pedidos", exportPedidos);
router.get("/rutas", exportRutas);

export default router;
