import type { NextFunction, Request, Response } from "express";

export function errorMiddleware(
    err: unknown,
    _req: Request,
    res: Response,
    _next: NextFunction
) {
    console.error(" Unhandled error:", err);

    return res.status(500).json({
        ok: false,
        message: "Internal Server Error",
    });
}