import { Router } from "express";
import { InteractionController } from "../controllers/interaction.controller.js";
import { authMiddleware, requireRole } from "../middlewares/auth.middleware.js";

const router = Router();
const controller = new InteractionController();

router.post("/", authMiddleware, (req, res) => controller.create(req, res));
router.get("/mias", authMiddleware, (req, res) => controller.mine(req, res));
router.get("/", authMiddleware, requireRole("admin"), (req, res) => controller.all(req, res));

export default router;
