import express from "express";
import profileController from "./profile.controller.js";
import {
  authenticate,
  allowRoles,
} from "../../common/middlewares/auth.middleware.js";
import { cvPdfUpload } from "../../config/multer.config.js";

const router = express.Router();

// GET /api/profiles/me
router.get(
  "/me",
  authenticate,
  allowRoles("candidate"),
  profileController.getProfile,
);

// PUT /api/profiles/me
router.put(
  "/me",
  authenticate,
  allowRoles("candidate"),
  profileController.updateProfile,
);

// POST /api/profiles/cv
router.post(
  "/cv",
  authenticate,
  allowRoles("candidate"),
  cvPdfUpload.single("cv"),
  profileController.uploadCV,
);

export default router;
