import "dotenv/config";
import type { SignOptions } from "jsonwebtoken";

if (!process.env.JWT_SECRET) {
  throw new Error("JWT_SECRET es obligatorio");
}

export const jwtConfig = {
  secret: process.env.JWT_SECRET,
  expiresIn: (process.env.JWT_EXPIRES_IN || "1h") as SignOptions["expiresIn"],
};