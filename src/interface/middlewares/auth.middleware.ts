import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { jwtConfig } from "../../infrastructure/config/jwt.js";

export interface AuthenticatedRequest extends Request {
  userId: number;
  userRole: string;
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

    (req as AuthenticatedRequest).userId = payload.id;
    (req as AuthenticatedRequest).userRole = payload.role;

    next();
  } catch {
    return res.status(401).json({
      message: "Token inválido o expirado",
    });
  }
}