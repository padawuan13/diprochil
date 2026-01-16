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

app.use(helmet());
app.use(cors());
app.use(express.json({ limit: "1mb" }));
app.use(morgan("dev"));

// 1) API
app.use(routes);
app.use("/exports", exportsRoutes);

// 2) Frontend estático (apps/api/public)
const publicDir = path.resolve(__dirname, "../public");
if (fs.existsSync(publicDir)) {
  app.use(express.static(publicDir));
}

// 3) Errores al final
app.use(errorMiddleware);

const port = Number(process.env.PORT ?? 3000);
app.listen(port, () => console.log(`✅ Running on port ${port}`));
