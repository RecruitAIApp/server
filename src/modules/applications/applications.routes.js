import { Router } from "express";
import { validate } from "../../common/middlewares/validation.middleware.js";
import { createApplicationValidation, updateApplicationStageValidation, applicationIdSchema, quickApplyValidation } from "./applications.validation.js";
import * as ApplicationController from "./applications.controller.js";
import { protect } from "../../common/middlewares/auth.middleware.js";
import { isCandidate, isEmployerOrHR, isJobOwner } from "../../common/middlewares/permissions.middleware.js";
import { jobIdSchema } from "../jobs/jobs.validation.js";

import { cvPdfUpload } from "../../config/multer.config.js";

const router = Router();

router.post('/apply', [protect, isCandidate, cvPdfUpload.single('resume'), validate(createApplicationValidation)], ApplicationController.applyToJobController);
router.get('/my-applications', [protect, isCandidate], ApplicationController.getMyApplicationsController);
router.put('/update-stage/:applicationId', [protect, isEmployerOrHR], validate(updateApplicationStageValidation), ApplicationController.updateApplicationStageController);
router.get('/job/:id', [protect, isEmployerOrHR, validate(jobIdSchema), isJobOwner], ApplicationController.getApplicationsByJobController);
router.post('/retry-screening/:applicationId', [protect, isEmployerOrHR, validate(applicationIdSchema)], ApplicationController.retryScreeningController);
router.post('/quick-apply', [protect, isCandidate, validate(quickApplyValidation)], ApplicationController.quickApplyController);

export default router;