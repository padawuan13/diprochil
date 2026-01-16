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

const candidates = [
  path.resolve(__dirname, "public"),     
  path.resolve(__dirname, "../public"),  
  path.resolve(process.cwd(), "public"), 
];

const publicDir = candidates.find((p) => fs.existsSync(p));

console.log(" Static candidates:", candidates);
console.log(" Static chosen:", publicDir);

if (publicDir) {
  app.use(express.static(publicDir));
  app.get("/", (_req, res) => {
    res.sendFile(path.join(publicDir, "index.html"));
  });
}


app.use(routes);
app.use("/exports", exportsRoutes);

app.get("/health", (_req, res) => res.json({ ok: true }));

app.use(errorMiddleware);

const port = Number(process.env.PORT ?? 3000);
app.listen(port, () => {
  console.log(` API + Web running on port ${port}`);
});
