import { Request, Response, NextFunction } from "express";
import { ConflictError } from "../../application/errors/conflict.error.js";
import { ValidationError } from "../../application/errors/validation.error.js";
import { UnauthorizedError } from "../../application/errors/unauthorized.error.js";

export function errorMiddleware(
  error: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
) {
  if (error instanceof ValidationError) {
    return res.status(400).json({
      message: error.message,
    });
  }

  if (error instanceof UnauthorizedError) {
    return res.status(401).json({
      message: error.message,
    });
  }

  if (error instanceof ConflictError) {
    return res.status(409).json({
      message: error.message,
    });
  }

  return res.status(500).json({
    message: "Error interno del servidor",
  });
}