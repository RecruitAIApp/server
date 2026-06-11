import { Router } from "express";
import { protect } from "../../common/middlewares/auth.middleware.js";
import { isCandidate, isEmployerOrHR } from "../../common/middlewares/permissions.middleware.js";
import * as Controller from "./interviewRecommendation.controller.js";

const router = Router();

// Generation & Regeneration (Shared/Company)
router.post("/generate/:applicationId", [protect, isEmployerOrHR], Controller.generateRecommendationController);
router.post("/regenerate/:applicationId", [protect], Controller.regenerateRecommendationController);

// Scoped retrieval
router.get("/my/:applicationId", [protect, isCandidate], Controller.getCandidateRecommendationController);
router.get("/:applicationId", [protect, isEmployerOrHR], Controller.getCompanyRecommendationController);

export default router;
