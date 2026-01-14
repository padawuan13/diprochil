import "express";

declare global {
  namespace Express {
    interface Request {
      user?: {
        id: number;
        role: "ADMIN" | "PLANIFICADOR" | "SUPERVISOR" | "CONDUCTOR";
        email: string;
      };
    }
  }
}
