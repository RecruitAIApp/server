import { Router } from "express";
import * as analyticsController from "./analytics.controller.js";
import {
  authenticate,
  allowRoles,
} from "../../common/middlewares/auth.middleware.js";

const router = Router();

// Employer + Admin can access company analytics
router.get(
  "/funnel",
  authenticate,
  allowRoles("employer", "admin"),
  analyticsController.getHiringFunnel,
);

router.get(
  "/applications-over-time",
  authenticate,
  allowRoles("employer", "admin"),
  analyticsController.getApplicationsOverTime,
);

router.get(
  "/ai-scores",
  authenticate,
  allowRoles("employer", "admin"),
  analyticsController.getAIScoreDistribution,
);

router.get(
  "/top-jobs",
  authenticate,
  allowRoles("employer", "admin"),
  analyticsController.getTopJobs,
);

// Admin only — platform-wide user growth
router.get(
  "/user-growth",
  authenticate,
  allowRoles("admin"),
  analyticsController.getUserGrowth,
);

export default router;
