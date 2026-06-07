import express from "express";
import { getRecommendations } from "./recommendation.controller.js";
import {
  authenticate,
  allowRoles,
} from "../../common/middlewares/auth.middleware.js";

const router = express.Router();

/**
 * Route: GET /api/recommendations/me
 * Desc: Retrieve semantic job recommendations for the logged-in candidate
 * Access: Private (Candidate only)
 */
router.get(
  "/me",
  authenticate,
  allowRoles("candidate"),
  getRecommendations
);

export default router;
