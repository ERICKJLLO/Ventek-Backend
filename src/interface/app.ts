import express from "express";
import cors from "cors";
import "dotenv/config";
import authRoutes from "./routes/auth.routes.js";
import serviceRoutes from "./routes/service.routes.js";
import interactionRoutes from "./routes/interaction.routes.js";
import { errorMiddleware } from "./middlewares/error.middleware.js";

const app = express();

const allowedOrigin = process.env.FRONTEND_ORIGIN;

if (!allowedOrigin) {
  throw new Error("FRONTEND_ORIGIN es obligatorio");
}

app.use(cors({ origin: allowedOrigin }));
app.use(express.json());

app.use("/api/auth", authRoutes);
app.use("/api/services", serviceRoutes);
app.use("/api/interactions", interactionRoutes);

app.use(errorMiddleware);

export default app;