import "dotenv/config";

export const jwtConfig = {
  secret: process.env.JWT_SECRET as string,
  expiresIn: (process.env.JWT_EXPIRES_IN || "1h") as "1h",
};