import jwt from "jsonwebtoken";
import { jwtConfig } from "./jwt.js";

export interface JwtPayload {
  id: number;
  role: string;
}

export function generateToken(payload: JwtPayload): string {
  return jwt.sign(payload, jwtConfig.secret, {
    expiresIn: jwtConfig.expiresIn,
  });
}