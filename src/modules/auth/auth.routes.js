import express from "express";
import authController from "./auth.controller.js";
import {
  registerSchema,
  loginSchema,
  refreshSchema,
  validateBody,
} from "./auth.validation.js";
import { protect } from "../../common/middlewares/auth.middleware.js";

const router = express.Router();

// POST /api/auth/register
router.post("/register", validateBody(registerSchema), authController.register);

// POST /api/auth/login
router.post("/login", validateBody(loginSchema), authController.login);

// POST /api/auth/refresh
router.post("/refresh", validateBody(refreshSchema), authController.refresh);

// GET /api/auth/me
router.get("/me", protect, authController.getMe);

// Additional auth routes
router.post("/logout", protect, authController.logout);
router.post("/forgot-password", authController.forgotPassword);
router.post("/reset-password", authController.resetPassword);
router.get("/profile", protect, authController.getProfile);
router.put("/profile", protect, authController.updateProfile);

export default router;
