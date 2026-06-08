import { Router } from "express";
import * as aiEvalController from "./aiEval.controller.js";
import {
  authenticate,
  allowRoles,
} from "../../common/middlewares/auth.middleware.js";

const router = Router();

// Save a new evaluation result — called internally by agents
router.post(
  "/",
  authenticate,
  allowRoles("admin"),
  aiEvalController.saveEvalResult,
);

// Get aggregated summary for dashboard
router.get(
  "/summary",
  authenticate,
  allowRoles("admin"),
  aiEvalController.getEvalSummary,
);

// Get list of failures
router.get(
  "/failures",
  authenticate,
  allowRoles("admin"),
  aiEvalController.getEvalFailures,
);

export default router;
