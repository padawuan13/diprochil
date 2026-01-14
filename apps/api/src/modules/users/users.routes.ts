import { Router } from "express";
import { authMiddleware } from "../../middlewares/auth.middleware";
import { requireRoles } from "../../middlewares/roles.middleware";
import { handleCreateUser, handleListUsers, handleUpdateUser, handleChangePassword } from "./users.controller";

export const usersRouter = Router();

usersRouter.use("/users",authMiddleware, requireRoles("ADMIN"));

usersRouter.get("/users", handleListUsers);
usersRouter.post("/users", handleCreateUser);
usersRouter.patch("/users/:id", handleUpdateUser);
usersRouter.patch("/users/:id/password", handleChangePassword);
