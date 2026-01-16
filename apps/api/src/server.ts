import "express-async-errors";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import dotenv from "dotenv";
import path from "path";
import fs from "fs";

import { routes } from "./routes";
import exportsRoutes from "./modules/exports/exports.routes";
import { errorMiddleware } from "./middlewares/error.middleware";

dotenv.config();

const app = express();

app.use(helmet({ contentSecurityPolicy: false }));

app.use(cors());
app.use(express.json({ limit: "1mb" }));
app.use(morgan("dev"));

const publicDir = fs.existsSync(path.join(__dirname, "../public")) 
    ? path.join(__dirname, "../public") 
    : path.join(__dirname, "public"); 

if (fs.existsSync(publicDir)) {
  app.use(express.static(publicDir));
  app.get("/", (_req, res) => {
    res.sendFile(path.join(publicDir, "index.html"));
  });
} else {
  app.get("/", (_req, res) => {
    res.json({ 
        status: "API Running", 
        message: "Diprochil API is active. Web UI folder not found.",
        db_connected: !!process.env.MYSQLHOST 
    });
  });
  console.warn("⚠️ No se encontró la carpeta pública en:", publicDir);
}

app.use(routes);
app.use("/exports", exportsRoutes);

app.get("/health", (_req, res) => res.json({ ok: true }));

app.use(errorMiddleware);

const port = Number(process.env.PORT ?? 3000);
app.listen(port, () => {
  console.log(`✅ API + Web running on port ${port}`);
});
