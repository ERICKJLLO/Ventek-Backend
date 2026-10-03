import { Router } from "express";
import { AuthController } from "../controllers/auth.controller.js";
import {
  authMiddleware,
  AuthenticatedRequest,
} from "../middlewares/auth.middleware.js";

const router = Router();
const authController = new AuthController();

router.post("/register", (req, res) => {
  return authController.register(req, res);
});

router.post("/login", (req, res) => {
  return authController.login(req, res);
});

router.get("/me", authMiddleware, (req, res) => {
  const authenticatedRequest = req as AuthenticatedRequest;

  return res.status(200).json({
    userId: authenticatedRequest.userId,
    role: authenticatedRequest.userRole,
  });
});

export default router;