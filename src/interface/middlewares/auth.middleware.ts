import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { jwtConfig } from "../../infrastructure/config/jwt.js";

export interface AuthenticatedRequest extends Request {
  userId: number;
  userRole: string;
}

export function getAuthenticatedRequest(req: Request): AuthenticatedRequest {
  return req as AuthenticatedRequest;
}

export function authMiddleware(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  const authorization = req.headers.authorization;

  if (!authorization || !authorization.startsWith("Bearer ")) {
    return res.status(401).json({
      message: "Token no proporcionado",
    });
  }

  const token = authorization.substring(7);

  try {
    const payload = jwt.verify(token, jwtConfig.secret) as {
      id: number;
      role: string;
    };

    if (
      typeof payload.id !== "number" ||
      !Number.isInteger(payload.id) ||
      typeof payload.role !== "string"
    ) {
      return res.status(401).json({
        message: "Token inválido o expirado",
      });
    }

    getAuthenticatedRequest(req).userId = payload.id;
    getAuthenticatedRequest(req).userRole = payload.role;

    next();
  } catch {
    return res.status(401).json({
      message: "Token inválido o expirado",
    });
  }
}

export function requireRole(...roles: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    const authenticatedRequest = getAuthenticatedRequest(req);

    if (!roles.includes(authenticatedRequest.userRole)) {
      return res.status(403).json({
        message: "No tienes permisos suficientes",
      });
    }

    next();
  };
}