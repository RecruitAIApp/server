import express from "express";
import profileController from "./profile.controller.js";
import {
  authenticate,
  allowRoles,
} from "../../common/middlewares/auth.middleware.js";
import { cvPdfUpload, avatarUpload } from "../../config/multer.config.js";

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

// POST /api/profiles/avatar
router.post(
  "/avatar",
  authenticate,
  allowRoles("candidate"),
  avatarUpload.single("avatar"),
  profileController.uploadAvatar,
);

// GET /api/profiles/saved-jobs
router.get(
  "/saved-jobs",
  authenticate,
  allowRoles("candidate"),
  profileController.getSavedJobs,
);

// POST /api/profiles/saved-jobs/:jobId
router.post(
  "/saved-jobs/:jobId",
  authenticate,
  allowRoles("candidate"),
  profileController.saveJob,
);

// DELETE /api/profiles/saved-jobs/:jobId
router.delete(
  "/saved-jobs/:jobId",
  authenticate,
  allowRoles("candidate"),
  profileController.unsaveJob,
);

export default router;
