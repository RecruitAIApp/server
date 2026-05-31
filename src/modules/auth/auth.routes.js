import express from "express";
import authController from "./auth.controller.js";
import profileController from "../profiles/profile.controller.js";
import {
  registerSchema,
  loginSchema,
  refreshSchema,
  ownerCompanyOnboardSchema,
  validateBody,
  acceptHRInviteSchema,
} from "./auth.validation.js";
import {
  authenticate,
  allowRoles,
} from "../../common/middlewares/auth.middleware.js";
import { cvPdfUpload } from "../../config/multer.config.js";

const router = express.Router();

// POST /api/auth/register
router.post("/register", validateBody(registerSchema), authController.register);

// POST /api/auth/employer/onboard-company (authenticated pending owner)
router.post(
  "/employer/onboard-company",
  authenticate,
  allowRoles("employer"),
  validateBody(ownerCompanyOnboardSchema),
  authController.onboardOwnerCompany,
);

// POST /api/auth/login
router.post("/login", validateBody(loginSchema), authController.login);

// POST /api/auth/refresh
router.post("/refresh", validateBody(refreshSchema), authController.refresh);

// POST /api/auth/accept-hr-invite
router.post(
  "/accept-hr-invite",
  validateBody(acceptHRInviteSchema),
  authController.acceptHRInvite
);

// GET /api/auth/me
router.get("/me", authenticate, authController.getMe);

// POST /api/auth/logout
router.post("/logout", authenticate, authController.logout);

// POST /api/auth/forgot-password
router.post("/forgot-password", authController.forgotPassword);

// POST /api/auth/reset-password
router.post("/reset-password", authController.resetPassword);

// Candidate profile builder 
router.get(
  "/profile",
  authenticate,
  allowRoles("candidate"),
  profileController.getProfile,
);
router.put(
  "/profile",
  authenticate,
  allowRoles("candidate"),
  profileController.updateProfile,
);
router.post(
  "/profile/cv",
  authenticate,
  allowRoles("candidate"),
  cvPdfUpload.single("cv"),
  profileController.uploadCV,
);

export default router;
