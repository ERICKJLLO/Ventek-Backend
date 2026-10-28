import { Router } from "express";
import { ServiceController } from "../controllers/service.controller.js";
import { authMiddleware, requireRole } from "../middlewares/auth.middleware.js";

const router = Router();
const controller = new ServiceController();

router.get("/", (req, res) => controller.list(req, res));
router.get("/:id", (req, res) => controller.get(req, res));
router.post("/", authMiddleware, requireRole("admin"), (req, res) => controller.create(req, res));
router.put("/:id", authMiddleware, requireRole("admin"), (req, res) => controller.update(req, res));
router.delete("/:id", authMiddleware, requireRole("admin"), (req, res) => controller.delete(req, res));

export default router;
