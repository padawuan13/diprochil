import { Router } from "express";
import { handleLogin, handleMe } from "./auth.controller";
import { authMiddleware } from "../../middlewares/auth.middleware";

export const authRouter = Router();

authRouter.post("/auth/login", handleLogin);
authRouter.get("/auth/me", authMiddleware, handleMe);