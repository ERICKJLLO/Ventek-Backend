import { Request, Response, NextFunction } from "express";
import { ConflictError } from "../../application/errors/conflict.error.js";

export function errorMiddleware(
  error: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
) {
  if (error instanceof ConflictError) {
    return res.status(409).json({
      message: error.message,
    });
  }

  return res.status(500).json({
    message: "Error interno del servidor",
  });
}