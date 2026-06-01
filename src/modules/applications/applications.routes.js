import { Router } from "express";
import { validate } from "../../common/middlewares/validation.middleware.js";
import { createApplicationValidation, updateApplicationStageValidation, applicationIdSchema } from "./applications.validation.js";
import * as ApplicationController from "./applications.controller.js";
import { protect } from "../../common/middlewares/auth.middleware.js";
import { isCandidate, isEmployerOrHR, isJobOwner } from "../../common/middlewares/permissions.middleware.js";
import { jobIdSchema } from "../jobs/jobs.validation.js";

const router = Router();

router.post('/apply', [protect, isCandidate, validate(createApplicationValidation)], ApplicationController.applyToJobController);
router.put('/update-stage/:applicationId', [protect, isEmployerOrHR], validate(updateApplicationStageValidation), ApplicationController.updateApplicationStageController);
router.get('/job/:id', [protect, isEmployerOrHR, validate(jobIdSchema), isJobOwner], ApplicationController.getApplicationsByJobController);
router.post('/retry-screening/:applicationId', [protect, isEmployerOrHR, validate(applicationIdSchema)], ApplicationController.retryScreeningController);

export default router;