import { Router } from "express";
import { validate } from "../../common/middlewares/validation.middleware.js";
import {
  createApplicationValidation,
  updateApplicationStageValidation,
  applicationIdSchema,
  addNoteSchema
} from "./applications.validation.js";
import * as ApplicationController from "./applications.controller.js";
import { protect } from "../../common/middlewares/auth.middleware.js";
import { isCandidate, isEmployerOrHR, isJobOwner } from "../../common/middlewares/permissions.middleware.js";
import { jobIdSchema } from "../jobs/jobs.validation.js";

const router = Router();

// Candidate Routes
router.post('/apply', [protect, isCandidate, validate(createApplicationValidation)], ApplicationController.applyToJobController);
router.get('/my-applications', [protect, isCandidate], ApplicationController.getCandidateApplicationsController);

// Shared / Detail Routes
router.get('/:applicationId', [protect, validate(applicationIdSchema)], ApplicationController.getApplicationDetailsController);

// Employer / HR Routes
router.put('/update-stage/:applicationId', [protect, isEmployerOrHR], validate(updateApplicationStageValidation), ApplicationController.updateApplicationStageController);
router.get('/job/:id', [protect, isEmployerOrHR, validate(jobIdSchema), isJobOwner], ApplicationController.getApplicationsByJobController);
router.get('/job/:id/kanban', [protect, isEmployerOrHR, validate(jobIdSchema), isJobOwner], ApplicationController.getJobKanbanController);
router.post('/retry-screening/:applicationId', [protect, isEmployerOrHR, validate(applicationIdSchema)], ApplicationController.retryScreeningController);
router.post('/:id/notes', [protect, isEmployerOrHR, validate(addNoteSchema)], ApplicationController.addApplicationNoteController);

export default router;