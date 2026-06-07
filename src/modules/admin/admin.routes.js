import { Router } from "express";
import * as adminController from "./admin.controller.js";
import {
  authenticate,
  allowRoles,
} from "../../common/middlewares/auth.middleware.js";

const router = Router();

// All routes require authentication + admin role
router.use(authenticate, allowRoles("admin"));

// GET /api/admin/stats
router.get("/stats", adminController.getPlatformStats);

// GET /api/admin/users
router.get("/users", adminController.getAllUsers);

// GET /api/admin/employers/pending
router.get("/employers/pending", adminController.getPendingEmployers);

// PATCH /api/admin/users/:userId/ban
router.patch("/users/:userId/ban", adminController.banUser);

// PATCH /api/admin/users/:userId/unban
router.patch("/users/:userId/unban", adminController.unbanUser);

// PATCH /api/admin/employers/:userId/approve
router.patch("/employers/:userId/approve", adminController.approveEmployer);

// DELETE /api/admin/jobs/:jobId
router.delete("/jobs/:jobId", adminController.deleteJob);

export default router;
