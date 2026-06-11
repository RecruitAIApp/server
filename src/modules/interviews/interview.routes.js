import { Router } from "express";
import { protect } from "../../common/middlewares/auth.middleware.js";
import { isCandidate, isEmployerOrHR } from "../../common/middlewares/permissions.middleware.js";
import { validate } from "../../common/middlewares/validation.middleware.js";
import {
  createInterviewValidation,
  updateInterviewValidation,
  interviewIdValidation,
} from "./interview.validation.js";
import * as InterviewController from "./interview.controller.js";

const router = Router();

// Candidate Route
router.get("/my", [protect, isCandidate], InterviewController.getCandidateInterviewsController);

// Employer / HR Routes
router.post("/", [protect, isEmployerOrHR, validate(createInterviewValidation)], InterviewController.createInterviewController);
router.get("/company", [protect, isEmployerOrHR], InterviewController.getCompanyInterviewsController);

// Shared / Specific Routes
router.get("/:id", [protect, validate(interviewIdValidation)], InterviewController.getInterviewDetailsController);
router.patch("/:id", [protect, isEmployerOrHR, validate(updateInterviewValidation)], InterviewController.updateInterviewController);
router.patch("/:id/cancel", [protect, isEmployerOrHR, validate(interviewIdValidation)], InterviewController.cancelInterviewController);
router.patch("/:id/complete", [protect, isEmployerOrHR, validate(interviewIdValidation)], InterviewController.completeInterviewController);

export default router;
