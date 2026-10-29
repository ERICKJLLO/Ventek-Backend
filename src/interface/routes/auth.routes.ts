import { Router } from "express";
import { AuthController } from "../controllers/auth.controller.js";
import { authMiddleware } from "../middlewares/auth.middleware.js";

const router = Router();
const authController = new AuthController();

router.get("/me", authMiddleware, (req, res) => authController.me(req, res));
router.put("/me", authMiddleware, (req, res) => authController.updateMe(req, res));
router.put("/me/password", authMiddleware, (req, res) => authController.changePassword(req, res));
router.post("/register", (req, res) => {
  return authController.register(req, res);
});

router.post("/login", (req, res) => {
  return authController.login(req, res);
});

export default router;