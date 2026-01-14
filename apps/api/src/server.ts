import "express-async-errors";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import dotenv from "dotenv";
import { routes } from "./routes";
import { errorMiddleware } from "./middlewares/error.middleware";
import exportsRoutes from "./modules/exports/exports.routes";

dotenv.config();

const app = express();

app.use((req, res, next) => {
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  next();
});

app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '1mb' }));
app.use(morgan("dev"));

app.use(routes);

app.use(errorMiddleware);

app.use("/exports", exportsRoutes);

const port = Number(process.env.PORT ?? 3000);

app.listen(port, () => {
  console.log(`✅ API running on http://localhost:${port}`);
});